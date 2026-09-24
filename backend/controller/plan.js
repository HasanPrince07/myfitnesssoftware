const helper = require("../helper/message");
const pool = require('../db');


exports.fetchplan = async (req, res) => {
    const { search, duration, status } = req.body;
    const limit = req.body.limit === 'ALL' ? 'ALL' : parseInt(req.body.limit, 10) || 10;
    const offset = parseInt(req.body.offset, 10) || 0;

    try {
        let values = [];
        let conditions = [`p.is_deleted = FALSE`];

        if (search && search.trim() !== "") {
            let originalSearch = search.trim()
            let numericSearch = originalSearch.replace(/\D/g, "");
            values.push(`%${originalSearch}%`);
            const idx1 = values.length;
            if (numericSearch !== "") {
                values.push(`%${numericSearch}%`);
                const idx2 = values.length;
                conditions.push(`(p.name ILIKE $${idx1} OR p.duration ILIKE $${idx1} OR p.custom_days::text ILIKE $${idx2})`);
            } else {
                conditions.push(`(p.name ILIKE $${idx1} OR p.duration ILIKE $${idx1})`);
            }
        }

        if (duration && duration.trim() !== "") {
            values.push(`%${duration.trim()}%`);
            conditions.push(`p.duration ILIKE $${values.length}`);
        }

        if (status && status.trim() !== "") {
            if (status === 'Active' || status === 'Inactive') {
                values.push(status === 'Active');
                conditions.push(`p.is_active = $${values.length}`);
            } else {
                values.push(`%${status.trim()}%`);
                conditions.push(`p.is_active::text ILIKE $${values.length}`);
            }
        }

        let whereClause = "";
        if (conditions.length > 0) {
            whereClause += ` WHERE ` + conditions.join(" AND ");
        }

        const countQuery = `SELECT COUNT(*)::int AS total_count FROM plans p ${whereClause};`;
        const countResult = await pool.query(countQuery, values);
        const totalRows = countResult.rows[0]?.total_count || 0;

        if (totalRows === 0) {
            return res.status(200).json({ message: helper.dataMessage, data: [], totalRows: 0 });
        }

        let dataQuery = `SELECT p.id, p.name, p.price, p.duration, p.custom_days, p.is_active, p.description, p.created_at, COUNT(m.id)::int AS total_members from plans p LEFT JOIN members m ON m.plan_id = p.id ${whereClause} GROUP BY p.id ORDER BY p.created_at DESC`;

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
        console.error("Error during fetch plans:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
};

exports.fetch_billing_plans = async (req, res) => {
    try {
        const fetchQuery = `SELECT DISTINCT p.id, p.name FROM billings b LEFT JOIN plans p ON b.plan_id = p.id WHERE b.is_deleted = FALSE ORDER BY p.name DESC;`;
        const result = await pool.query(fetchQuery);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: helper.dataMessage });
        }
        res.status(200).json({
            message: helper.fetchMessage,
            data: result.rows
        });
    } catch (error) {
        console.error("Error during fetch billing plans:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}

exports.fetchplanbyid = async (req, res) => {
    try {
        const id = req.params.id
        const fetchQuery = `SELECT p.id, p.name, p.price, p.duration, p.custom_days, p.description, p.created_at, p.is_active, COUNT(m.id)::int AS total_members FROM plans p LEFT JOIN members m ON m.plan_id = p.id WHERE p.id = $1 AND p.is_deleted = FALSE GROUP BY p.id;`;
        const result = await pool.query(fetchQuery, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: helper.dataMessage });
        }
        res.status(200).json({
            message: helper.fetchMessage,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error during fetch plan by id:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}

exports.actionplan = async (req, res) => {
    try {
        const { name, price, duration, custom_days, description, is_active } = req.body
        const id = req.params.id
        const dbCustomDays = custom_days !== undefined && custom_days !== null && String(custom_days).trim() !== "" ? custom_days : null;
        if (id && id !== "new") {
            const updateQuery = `UPDATE plans SET name = $1, price = $2, duration = $3, custom_days = $4, description = $5, is_active = $6 WHERE id = $7;`;
            const updateValues = [name, price, duration, dbCustomDays, description, is_active, id];
            const result = await pool.query(updateQuery, updateValues);
            if (result.rowCount === 0) {
                return res.status(404).json({ message: helper.dataMessage });
            }
            return res.status(200).json({ message: helper.updateMessage });
        } else {
            const insertQuery = `INSERT INTO plans (name, price, duration, custom_days, description, is_active) VALUES ($1, $2, $3, $4, $5, $6);`;
            const insertValues = [name, price, duration, dbCustomDays, description, is_active];
            await pool.query(insertQuery, insertValues);
            return res.status(201).json({ message: helper.insertMessage });
        }
    } catch (error) {
        console.error("Error during insert or update plan:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}

exports.deleteplans = async (req, res) => {
    try {
        const { ids } = req.body
        if (!ids || ids.length === 0) {
            return res.status(400).json({ message: "No IDs provided" });
        }
        const multipleDeleteQuery = `UPDATE plans SET is_deleted = TRUE WHERE id = ANY($1::int[])`;
        await pool.query(multipleDeleteQuery, [ids]);
        res.status(200).json({
            message: ids.length === 1 ? helper.deleteMessage : helper.multiDeleteMessage
        });
    } catch (error) {
        console.error("Error during delete plans:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}