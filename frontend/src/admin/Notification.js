import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import "./Admin.css";
// create pending amount column, last notification column, send notification functionality

const INITIAL_FILTERS = { search: "", plan: "", member: "" }

const FILTER_FIELDS = {
    member: [
        { value: "active", label: "Active" },
        { value: "expired", label: "Expired" },
        { value: "frozen", label: "Frozen" },
        { value: "no_plan", label: "No Active Plan" }
    ]
};

function Notification() {

    const [filter, setFilter] = useState(INITIAL_FILTERS);
    const [data, setData] = useState([]);
    const [plans, setPlans] = useState([]);

    const [messagType, setMessagType] = useState("payment");
    const [messageMember, setMessageMember] = useState(null);

    const [modal, setModal] = useState({ send: false });
    const [loading, setLoading] = useState({ table: false, modal: false });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const itemsPerPage = 10;
    const startingSerialNumber = (currentPage - 1) * itemsPerPage;

    const searchTimeoutRef = useRef(null);

    const handleFetch = useCallback(async (currentFilters, page) => {
        setLoading(prev => ({ ...prev, table: true }));
        try {
            const limit = itemsPerPage;
            const offset = (page - 1) * itemsPerPage;
            const res = await fetch(`/admin/fetchmember`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ...currentFilters, limit, offset })
            });
            const resData = await res.json();
            if (!res.ok) {
                setData([]);
                setTotalRows(0);
                toast(resData.message, { type: "error" });
                return;
            } else {
                setData(resData.data || []);
                setTotalRows(resData.totalRows || 0);
            }
        } catch (error) {
            toast("Network error, please check your internet", { type: "error" });
            console.error("Error during fetch member data:", error);
        } finally {
            setLoading(prev => ({ ...prev, table: false }));
        }
    }, []);

    const fetchPlans = useCallback(async () => {
        try {
            const res = await fetch(`/admin/fetchplan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ limit: "ALL" })
            });
            const resData = await res.json();
            if (!res.ok) {
                setPlans([]);
                toast(resData.message, { type: "error" });
                return;
            } else {
                setPlans(resData.data || []);
            }
        } catch (error) {
            toast("Network error, please check your internet", { type: "error" });
            console.error("Error during fetch member data:", error);
        }
    }, []);

    useEffect(() => {
        handleFetch(filter, currentPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleFetch, currentPage]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const updatedFilters = { ...filter, [name]: value };
        setFilter(updatedFilters);
        setCurrentPage(1);
        if (name === "search") {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            if (value.length > 0 && value.trim() === "") {
                return;
            }
            searchTimeoutRef.current = setTimeout(() => {
                const filtersToSend = { ...updatedFilters, search: value.trim() };
                handleFetch(filtersToSend, 1);
            }, 800);
        } else {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            handleFetch(updatedFilters, 1);
        }
    };

    const handleClearFilters = () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        setFilter(INITIAL_FILTERS);
        setCurrentPage(1);
        handleFetch(INITIAL_FILTERS, 1);
    };

    const sendWhatsAppReminder = (phone, name, daysLeft, message_type) => {
        const formattedPhone = `91${phone}`;
        let message = "";
        if (message_type === "payment") {
            message = `Hello ${name}, this is a friendly reminder from our gym regarding your pending membership payment. Kindly settle the due amount at the front desk during your next visit. Thank you!`;
        } else {
            if (daysLeft > 3) {
                message = `Welcome to the family, ${name}! Thank you for joining our gym. Your membership is now active. Get ready to smash your fitness goals! Let us know if you need any help.`;
            } else if (daysLeft > 0 && daysLeft <= 3) {
                message = `Hello ${name}, your fitness plan at our gym is expiring in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}. To continue your workout routine without any interruption, please renew your membership today. Thank you!`;
            } else if (daysLeft <= 0) {
                message = `Hello ${name}, your membership plan at our gym has expired. We miss seeing you on the floor! Please renew your package today to resume your gym sessions. Let's get back to your fitness goals!`;
            }
        }
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSendModal = (phone, name, daysLeft, payment_status) => {
        if (payment_status === "Due" && daysLeft) {
            setMessageMember({ phone, name, daysLeft });
            setMessagType("payment");
            setModal(prev => ({ ...prev, send: true }));
        } else if (payment_status === "Due" && !daysLeft) {
            sendWhatsAppReminder(phone, name, "no plan", "payment");
        } else if (payment_status === "Complete" && daysLeft) {
            sendWhatsAppReminder(phone, name, daysLeft, "expiry");
        }
    };

    const getPlanName = (planId) => {
        if (!planId) return "No Plan";
        const foundPlan = plans.find(p => String(p.id) === String(planId));
        return foundPlan ? foundPlan.name : "No Plan";
    };

    const renderRemainingDays = (member) => {
        if (member.is_paused) {
            return <span className="d-inline-block alert alert-secondary py-1 m-0">On Hold</span>;
        }

        const days = member.remaining_days;
        if (days === null || days === undefined) {
            return <span className="d-inline-block alert alert-secondary py-1 m-0">N/A</span>;
        }

        let alertClass = "alert-success";
        let statusText = `${days} days left`;

        if (days < 0) {
            alertClass = "alert-danger";
            const absoluteDays = Math.abs(days);
            statusText = `Expired (${absoluteDays} ${absoluteDays === 1 ? "day" : "days"} ago)`;
        } else if (days === 0) {
            alertClass = "alert-danger";
            statusText = "Expires today";
        } else if (days === 1) {
            alertClass = "alert-warning";
            statusText = "1 day left";
        } else if (days <= 3) {
            alertClass = "alert-warning";
        }

        return <span className={`d-inline-block alert ${alertClass} py-1 px-2 m-0`}>{statusText}</span>;
    };

    const hasActiveFilters = Object.values(filter).some(value => value.trim() !== "");

    return (
        <>
            <div id="admin-section" className="container-fluid">
                <div className="bg-white shadow-sm rounded-3 p-4 mx-0">
                    <div className="row g-3 align-items-center mb-4">
                        <div className="col-lg-9 col-12 position-relative">
                            <input placeholder="Search by member name, phone number..." type="text" name="search" value={filter.search} onChange={handleFilterChange} className="form-control shadow-none pe-5" />
                            <img className="search-icon position-absolute top-50 translate-middle-y end-0 me-3" src="/media/icons/search.png" alt="search-icon" />
                        </div>
                        <div className="col-lg-3 col-sm-6 col-12">
                            <button disabled={!hasActiveFilters} onClick={handleClearFilters} className="btn form-control text-uppercase fw-bold shadow-none grey-btn py-2">
                                clear all filters
                            </button>
                        </div>
                    </div>
                    <div className="row g-3 align-items-center">
                        <div className="col-md-6 col-12">
                            {plans.length === 0 ?
                                <Link to="/admin/plan" className="btn text-uppercase fw-bold shadow-none form-control green-btn">add a plan</Link>
                                :
                                <select name="plan" value={filter.plan} onChange={handleFilterChange} className="form-select shadow-none">
                                    <option value="">All Plans</option>
                                    {plans.map((dt) => (
                                        <option className="text-capitilize" key={dt.id} value={dt.id}>{dt.name}</option>
                                    ))}
                                </select>
                            }
                        </div>
                        <div className="col-md-6 col-12">
                            <select name="member" value={filter.member} onChange={handleFilterChange}
                                className="form-select shadow-none">
                                <option value="">All Members</option>
                                {FILTER_FIELDS.member.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: "1rem" }} className="row mx-0">
                    <div className="col-lg-3 col-md-4 col-6 px-0">
                        <button style={{ pointerEvents: "none" }} className="btn form-control text-uppercase fw-bold shadow-none black-btn multi-delete-btn hide">none</button>
                    </div>
                    <div className="col-12 overflow-hidden shadow-sm rounded-3 mt-3 px-0">
                        <div className="table-responsive">
                            <table className={`table text-center table-bordered align-middle ${data.length !== 0 ? "table-hover" : ""} mb-0`}>
                                <thead className="text-uppercase align-middle">
                                    <tr>
                                        <th>s.no.</th>
                                        <th>name</th>
                                        <th>phone</th>
                                        <th>plan</th>
                                        <th>dues</th>
                                        <th>expiry</th>
                                        <th>last notified</th>
                                        <th>action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading.table ? (
                                        <tr>
                                            <td colSpan={8} className="py-2"><div className="table-spinner spinner mx-auto"></div></td>
                                        </tr>
                                    ) : data.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-uppercase fw-bold text-muted">no data</td>
                                        </tr>
                                    ) : (
                                        data.map((member, index) => (
                                            <tr key={member.id}>
                                                <td>{startingSerialNumber + index + 1}</td>
                                                <td className="text-capitalize">{member.name}</td>
                                                <td>{member.phone}</td>
                                                <td>{getPlanName(member.plan_id)}</td>
                                                <td>1000</td>
                                                <td>{renderRemainingDays(member)}</td>
                                                <td>5 days befor</td>
                                                <td>
                                                    <div className="d-flex justify-content-center gap-3">
                                                        <button onClick={() => handleSendModal(member.phone, member.name, member.remaining_days, member.payment_status)} className="d-flex btn px-3 py-2 send-btn">
                                                            <img className="action-icon" src="/media/icons/send.png" alt="whatsapp-icon" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {modal.send &&
                <section id="action-modal-section" className="position-fixed top-0 bottom-0 start-0 end-0 z-1 d-flex align-items-center">
                    <div className="container">
                        <div className="row justify-content-center">
                            <div className="col-xl-6 col-lg-8 col-12 action-modal-div shadow-sm rounded-3 p-5">
                                <h3 className="text-center text-uppercase fw-bold">select reminder type</h3>
                                <p className="text-muted text-center px-sm-2">Choose the appropriate message template to send to the member via WhatsApp.</p>
                                <div className="d-flex">
                                    <div className="form-check form-check-inline me-4">
                                        <input className="form-check-input" type="radio" name="reminder_status" id="payment" value="payment" checked={messagType === "payment"} onChange={() => setMessagType("payment")} />
                                        <label className="form-check-label" htmlFor="payment">Payment</label>
                                    </div>
                                    <div className="form-check form-check-inline">
                                        <input className="form-check-input" type="radio" name="reminder_status" id="expiry" value="expiry" checked={messagType === "expiry"} onChange={() => setMessagType("expiry")} />
                                        <label className="form-check-label" htmlFor="expiry">Other</label>
                                    </div>
                                </div>
                                <div className="d-flex mt-4">
                                    <button onClick={() => setModal(prev => ({ ...prev, send: false }))} className="btn form-control text-uppercase shadow-none fw-bold light-btn me-3">cancel</button>
                                    <button onClick={() => {
                                        if (messageMember) {
                                            sendWhatsAppReminder(messageMember.phone, messageMember.name, messageMember.daysLeft, messagType);
                                        }
                                        setModal(prev => ({ ...prev, send: false }));
                                    }} className="btn form-control text-uppercase shadow-none fw-bold green-btn">send</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            }
        </>
    );
}

export default Notification;