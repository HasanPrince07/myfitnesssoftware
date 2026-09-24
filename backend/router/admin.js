const router = require("express").Router();
const member = require("../controller/member");
const plan = require("../controller/plan");
const billing = require("../controller/billing");


router.post("/fetchmember", member.fetchmember);
router.get("/fetchmemberbyid/:id", member.fetchmemberbyid);
router.post("/actionmember/:id", member.actionmember);
router.post("/deletemembers", member.deletemembers);

router.post("/fetchplan", plan.fetchplan);
router.post("/fetch_billing_plans", plan.fetch_billing_plans);
router.get("/fetchplanbyid/:id", plan.fetchplanbyid);
router.post("/actionplan/:id", plan.actionplan);
router.post("/deleteplans", plan.deleteplans);

router.post("/fetchbilling", billing.fetchbilling);
router.get("/fetchbillingbyid/:id", billing.fetchbillingbyid);
router.post("/delete_billings", billing.delete_billings);
router.post("/generatepdf", billing.generatepdf);


module.exports = router