const pool = require('../db');
const helper = require("../helper/message");
const handlebars = require("handlebars");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

exports.fetchbilling = async (req, res) => {
    const search = req.body.search || "";
    const payment = req.body.payment || "";
    const plan = req.body.plan || "";
    const startDate = req.body.startDate || "";
    const endDate = req.body.endDate || "";
    const limit = req.body.limit === 'ALL' ? 'ALL' : parseInt(req.body.limit, 10) || 10;
    const offset = parseInt(req.body.offset, 10) || 0;
    try {
        let baseQuery = `FROM billings b LEFT JOIN members m ON b.member_id = m.id LEFT JOIN plans p ON b.plan_id = p.id`;
        let values = [];
        let conditions = [`b.is_deleted = FALSE`];

        if (search && search.trim() !== "") {
            const cleanSearch = search.trim();
            const idx1 = values.length + 1;
            const idx2 = values.length + 2;
            const idx3 = values.length + 3;
            values.push(`%${cleanSearch}%`, `%${cleanSearch}%`, `%${cleanSearch}%`);
            conditions.push(`(b.invoice_no ILIKE $${idx1} OR m.name ILIKE $${idx2} OR m.phone ILIKE $${idx3})`);
        }

        const addCondition = (field, value) => {
            if (value === undefined || value === null || value.toString().trim() === "") {
                return;
            }
            const cleanValue = value.toString().trim();
            if (field === "b.plan_id") {
                if (cleanValue === "no_plan") {
                    conditions.push(`${field} is NULL`);
                } else {
                    values.push(cleanValue);
                    conditions.push(`${field} = $${values.length}`);
                }
            } else {
                values.push(cleanValue);
                conditions.push(`${field} ILIKE $${values.length}`);
            }
        };

        addCondition('b.payment_status', payment);
        addCondition('b.plan_id', plan);

        if (startDate && startDate.trim() !== "") {
            values.push(`${startDate} 00:00:00`);
            conditions.push(`b.created_at >= $${values.length}::timestamp`);
        }

        if (endDate && endDate.trim() !== "") {
            values.push(`${endDate} 23:59:59`);
            conditions.push(`b.created_at <= $${values.length}::timestamp`);
        }

        if (conditions.length > 0) {
            baseQuery += ` WHERE ` + conditions.join(" AND ");
        }

        const countQuery = `SELECT COUNT(*)::int AS total_count ${baseQuery};`;
        const countResult = await pool.query(countQuery, values);
        const totalRows = countResult.rows[0]?.total_count || 0;

        if (totalRows === 0) {
            return res.status(200).json({ message: helper.dataMessage, data: [], totalRows: 0 });
        }

        let dataQuery = `SELECT b.id, b.invoice_no, b.total_amount, b.pay_amount, b.remaining_amount, b.payment_status, b.created_at, m.id AS member_id, m.name AS member_name, m.phone AS member_phone, m.expiry_date AS plan_expiry_date, p.name AS plan_name ${baseQuery}`;
        dataQuery += ` ORDER BY b.created_at DESC`;

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
        console.error("Error during fetch:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
};

exports.fetchbillingbyid = async (req, res) => {
    try {
        const id = req.params.id
        const fetchQuery = `SELECT b.id, b.invoice_no, b.total_amount, b.pay_amount, b.remaining_amount, b.payment_status, b.created_at, m.id AS member_id, m.name AS member_name, m.phone AS member_phone, m.expiry_date AS plan_expiry_date, p.name AS plan_name FROM billings b LEFT JOIN members m ON b.member_id = m.id LEFT JOIN plans p ON b.plan_id = p.id WHERE b.id = $1 AND b.is_deleted = FALSE ORDER BY b.created_at DESC LIMIT 1;`;
        const result = await pool.query(fetchQuery, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: helper.dataMessage });
        }
        res.status(200).json({
            message: helper.fetchMessage,
            data: result.rows[0]
        });
    } catch (error) {
        console.log("Error during fetch by id:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}

exports.delete_billings = async (req, res) => {
    try {
        const { ids } = req.body
        if (!ids || ids.length === 0) {
            return res.status(400).json({ message: "No IDs provided" });
        }
        const multipleDeleteQuery = `UPDATE billings SET is_deleted = TRUE WHERE id = ANY($1::int[])`;
        await pool.query(multipleDeleteQuery, [ids]);
        res.status(200).json({
            message: ids.length === 1 ? helper.deleteMessage : helper.multiDeleteMessage
        })
    } catch (error) {
        console.error("Error during delete:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}

exports.generatepdf = async (req, res) => {
    try {
        const dynamicData = { ...req.body };
        if (dynamicData.created_at) {
            const dateObj = new Date(dynamicData.created_at);
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            dynamicData.created_at = `${day}-${month}-${year}`;
        }
        if (dynamicData.plan_expiry_date) {
            const dateObj = new Date(dynamicData.plan_expiry_date);
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            dynamicData.plan_expiry_date = `${day}-${month}-${year}`;
        }
        if (dynamicData.member_id) {
            dynamicData.member_id = `FIT-${String(dynamicData.member_id).padStart(3, '0')}`
        }

        const launchOptions = {
            headless: "new",
            args: ['--no-sandbox']
        }

        if (process.env.NODE_ENV !== "production") {
            launchOptions.executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
        }

        const browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        const brochureDir = path.join(__dirname, "..", "pdf");
        const htmlContentRaw = fs.readFileSync(path.join(brochureDir, 'invoice.html'), 'utf8');

        const template = handlebars.compile(htmlContentRaw);
        const finalHtml = template(dynamicData);

        await page.setContent(finalHtml, { waitUntil: 'domcontentloaded' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '5px', right: '5px', bottom: '5px', left: '5px' }
        });
        await browser.close();

        res.status(200).set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=brochure.pdf',
            'Content-Length': pdfBuffer.length
        });
        res.end(pdfBuffer);
    } catch (error) {
        console.error("Error during generate pdf:", error);
        res.status(500).json({ message: helper.serverMessage });
    }
}