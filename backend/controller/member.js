const helper = require("../helper/message");
const pool = require('../db');


exports.fetchmember = async (req, res) => {
    const search = req.body.search || "";
    const gender = req.body.gender || "";
    const plan = req.body.plan || "";
    const payment = req.body.payment || "";
    const member = req.body.member || "";
    const limit = req.body.limit === 'ALL' ? 'ALL' : parseInt(req.body.limit, 10) || 10;
    const offset = parseInt(req.body.offset, 10) || 0;
    try {
        let baseQuery = `FROM members`;
        let values = [];
        let conditions = [`is_deleted = FALSE`];

        if (search && search.trim() !== "") {
            const cleanSearch = search.trim().toLowerCase();
            if (cleanSearch !== "fit" && cleanSearch !== "fit-") {
                let processedSearch = cleanSearch;
                if (cleanSearch.startsWith("fit-")) {
                    processedSearch = cleanSearch.replace("fit-", "");
                } else if (cleanSearch.startsWith("fit")) {
                    processedSearch = cleanSearch.replace("fit", "");
                }

                let numericId = processedSearch.replace(/\D/g, "");
                if (numericId) {
                    numericId = parseInt(numericId, 10).toString();
                }

                if (numericId) {
                    const idx1 = values.length + 1;
                    const idx2 = values.length + 2;
                    const idx3 = values.length + 3;

                    values.push(numericId, `%${cleanSearch}%`, `%${cleanSearch}%`);
                    conditions.push(`(id::text = $${idx1} OR name ILIKE $${idx2} OR phone ILIKE $${idx3})`);
                } else {
                    const idx1 = values.length + 1;
                    const idx2 = values.length + 2;

                    values.push(`%${cleanSearch}%`, `%${cleanSearch}%`);
                    conditions.push(`(name ILIKE $${idx1} OR phone ILIKE $${idx2})`);
                }
            }
        }

        const addCondition = (field, value) => {
            if (value === undefined || value === null || value.toString().trim() === "") {
                return;
            }
            const cleanValue = value.toString().trim();
            values.push(cleanValue);
            if (field === "plan_id") {
                conditions.push(`${field} = $${values.length}`);
            } else {
                conditions.push(`${field} ILIKE $${values.length}`);
            }
        };

        addCondition('gender', gender);
        addCondition('plan_id', plan);
        addCondition('payment_status', payment);

        if (member && member.trim() !== "") {
            const filterType = member.trim().toLowerCase();
            if (filterType === "active") {
                conditions.push(`is_paused = FALSE AND plan_id IS NOT NULL AND expiry_date >= CURRENT_DATE`);
            } else if (filterType === "expired") {
                conditions.push(`is_paused = FALSE AND expiry_date < CURRENT_DATE`);
            } else if (filterType === "frozen") {
                conditions.push(`is_paused = TRUE`);
            } else if (filterType === "no_plan") {
                conditions.push(`(plan_id = 0 OR plan_id IS NULL)`);
            }
        }

        baseQuery += ` WHERE ` + conditions.join(" AND ");

        const countQuery = `SELECT COUNT(*)::int AS total_count ${baseQuery};`;
        const countResult = await pool.query(countQuery, values);
        const totalRows = countResult.rows[0]?.total_count || 0;

        if (totalRows === 0) {
            return res.status(200).json({ message: helper.dataMessage, data: [], totalRows: 0 });
        }

        let dataQuery = `SELECT id, name, phone, gender, payment_status, plan_id, is_paused, joining_date, expiry_date, CASE WHEN is_paused = TRUE THEN (expiry_date - pause_start_date) ELSE (expiry_date - CURRENT_DATE) END AS remaining_days ${baseQuery}`;
        dataQuery += ` ORDER BY created_at DESC`;

        if (limit !== 'ALL') {
            dataQuery += ` LIMIT ${limit} OFFSET ${offset};`;
        } else {
            dataQuery += `;`;
        }

        const result = await pool.query(dataQuery, values);
        res.status(200).json({
            message: helper.fetchMessage,
            data: result.rows,
            totalRows: totalRows
        });
    } catch (error) {
        console.error("Error during fetch members:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
};

exports.fetchmemberbyid = async (req, res) => {
    try {
        const id = req.params.id
        const fetchQuery = `SELECT m.id, m.name, m.phone, m.gender, m.payment_status, m.plan_id, m.joining_date, m.expiry_date, m.is_paused, 
            CASE WHEN m.is_paused = TRUE THEN (m.expiry_date - m.pause_start_date) ELSE (m.expiry_date - CURRENT_DATE) END AS remaining_days,
            COALESCE(b.total_amount, 0) AS total_amount, COALESCE(b.pay_amount, 0) AS pay_amount, COALESCE(b.remaining_amount, 0) AS remaining_amount
            FROM members m LEFT JOIN billings b ON m.id = b.member_id WHERE m.id = $1 AND m.is_deleted = FALSE ORDER BY b.created_at DESC LIMIT 1;`;
        const result = await pool.query(fetchQuery, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: helper.dataMessage });
        }
        res.status(200).json({
            message: helper.fetchMessage,
            data: result.rows[0]
        });
    } catch (error) {
        console.log("Error during fetch:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}

exports.actionmember = async (req, res) => {
    try {
        const { name, phone, gender, plan_id, joining_date, expiry_date, is_paused, total_amount, pay_amount, remaining_amount, payment_status } = req.body
        const id = req.params.id
        const dbExpiryDate = expiry_date && expiry_date.trim() !== "" ? expiry_date : null;
        const dbPlanId = plan_id && plan_id !== "" ? plan_id : null;
        const incomingIsPaused = is_paused === true || is_paused === "true";
        const currentTotalAmount = Number(total_amount) || 0;

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        if (id && id !== "new") {
            const oldQuery = `SELECT is_paused, pause_start_date, plan_id, joining_date, expiry_date FROM members WHERE id = $1;`;
            const oldResult = await pool.query(oldQuery, [id]);
            if (oldResult.rowCount === 0) {
                return res.status(404).json({ message: helper.dataMessage });
            }

            const oldMember = oldResult.rows[0];
            let finalExpiryDate = dbExpiryDate;
            let finalPauseStartDate = oldMember.pause_start_date;

            if (incomingIsPaused && !oldMember.is_paused) {
                finalPauseStartDate = todayStr;
                finalExpiryDate = oldMember.expiry_date;
            }
            else if (!incomingIsPaused && oldMember.is_paused) {
                if (oldMember.expiry_date && oldMember.pause_start_date) {
                    const expiry = new Date(oldMember.expiry_date);
                    const pauseStart = new Date(oldMember.pause_start_date);
                    const timeDiff = expiry.getTime() - pauseStart.getTime();
                    const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                    if (remainingDays > 0) {
                        const newExpiry = new Date(today);
                        newExpiry.setDate(today.getDate() + remainingDays);
                        finalExpiryDate = newExpiry.toISOString().split('T')[0];
                    }
                }
                finalPauseStartDate = null;
            }

            const updateQuery = `UPDATE members SET name = $1, phone = $2, plan_id = $3, gender = $4, payment_status = $5, joining_date = $6, expiry_date = $7, is_paused = $8, pause_start_date = $9 WHERE id = $10;`;
            const updateValues = [name, phone, dbPlanId, gender, payment_status, joining_date, finalExpiryDate, incomingIsPaused, finalPauseStartDate, id];
            const result = await pool.query(updateQuery, updateValues);
            if (result.rowCount === 0) {
                return res.status(404).json({ message: helper.dataMessage });
            }
            if (dbPlanId || currentTotalAmount > 0) {
                const isPlanChanged = oldMember.plan_id !== dbPlanId;
                const oldJoiningStr = oldMember.joining_date ? new Date(oldMember.joining_date).toISOString().split('T')[0] : '';
                const isDateChanged = oldJoiningStr !== joining_date;
                if (isPlanChanged || isDateChanged) {
                    const invoiceNo = `INV-${Date.now()}`;
                    const billingQuery = `INSERT INTO billings (invoice_no, member_id, plan_id, total_amount, pay_amount, remaining_amount, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
                    const billingValues = [invoiceNo, id, dbPlanId, currentTotalAmount, Number(pay_amount) || 0, Number(remaining_amount) || 0, payment_status];
                    await pool.query(billingQuery, billingValues);
                } else {
                    const latestInvoiceQuery = `SELECT invoice_no FROM billings WHERE member_id = $1 AND is_deleted = FALSE AND (($2::integer IS NULL AND plan_id IS NULL) OR (plan_id = $2)) ORDER BY id DESC LIMIT 1;`;
                    const latestInvoiceResult = await pool.query(latestInvoiceQuery, [id, dbPlanId]);
                    if (latestInvoiceResult.rowCount > 0) {
                        const currentInvoiceNo = latestInvoiceResult.rows[0].invoice_no;
                        const updateBillingQuery = `UPDATE billings SET total_amount = $1, pay_amount = $2, remaining_amount = $3, payment_status = $4 WHERE invoice_no = $5;`;
                        const updateBillingValues = [currentTotalAmount, Number(pay_amount) || 0, Number(remaining_amount) || 0, payment_status, currentInvoiceNo];
                        await pool.query(updateBillingQuery, updateBillingValues);
                    } else {
                        const invoiceNo = `INV-${Date.now()}`;
                        const billingQuery = `INSERT INTO billings (invoice_no, member_id, plan_id, total_amount, pay_amount, remaining_amount, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
                        const billingValues = [invoiceNo, id, dbPlanId, currentTotalAmount, Number(pay_amount) || 0, Number(remaining_amount) || 0, payment_status];
                        await pool.query(billingQuery, billingValues);
                    }
                }
            }
            return res.status(200).json({ message: helper.updateMessage });
        } else {
            const insertQuery = `INSERT INTO members (name, phone, gender, payment_status, plan_id, joining_date, expiry_date, is_paused, pause_start_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id;`;
            const insertValues = [name, phone, gender, payment_status, dbPlanId, joining_date, dbExpiryDate, false, null];
            const memberResult = await pool.query(insertQuery, insertValues);
            const newMemberId = memberResult.rows[0].id;
            if (dbPlanId || currentTotalAmount > 0) {
                const invoiceNo = `INV-${Date.now()}`;
                const billingQuery = `INSERT INTO billings (invoice_no, member_id, plan_id, total_amount, pay_amount, remaining_amount, payment_status) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
                const billingValues = [invoiceNo, newMemberId, dbPlanId, currentTotalAmount, Number(pay_amount) || 0, Number(remaining_amount) || 0, payment_status];
                await pool.query(billingQuery, billingValues);
            }
            return res.status(201).json({ message: helper.insertMessage });
        }
    } catch (error) {
        console.error("Error during insert or update:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}

exports.deletemembers = async (req, res) => {
    try {
        const { ids } = req.body
        if (!ids || ids.length === 0) {
            return res.status(400).json({ message: "No IDs provided" });
        }
        const multipleDeleteQuery = `UPDATE members SET is_deleted = TRUE WHERE id = ANY($1::int[])`;
        await pool.query(multipleDeleteQuery, [ids]);
        res.status(200).json({
            message: ids.length === 1 ? helper.deleteMessage : helper.multiDeleteMessage
        })
    } catch (error) {
        console.error("Error during delete:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}