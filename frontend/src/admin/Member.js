import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import * as XLSX from 'xlsx';
import DeleteModal from "../common/DeleteModal";
import "./Admin.css";
// send mssg after 5 7 absent, attendance row, pdf functionality


const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

const INITIAL_STATE = { name: "", phone: "", gender: "", payment_status: "", is_paused: false, joining_date: getTodayDate(), expiry_date: "", remaining_days: "", plan_id: "", total_amount: 0, pay_amount: 0, remaining_amount: 0 }
const INITIAL_FILTERS = { search: "", gender: "", plan: "", payment: "", member: "" }

const FILTER_FIELDS = {
    gender: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" }
    ],
    payment: [
        { value: "complete", label: "Complete" },
        { value: "partial", label: "Partial" },
        { value: "due", label: "Due" }
    ],
    member: [
        { value: "active", label: "Active" },
        { value: "expired", label: "Expired" },
        { value: "frozen", label: "Frozen" },
        { value: "no_plan", label: "No Active Plan" }
    ]
};

const calculateExpiryDate = (joining_date, duration) => {
    if (!joining_date || !duration) return "";
    const date = new Date(joining_date);
    if (typeof (duration) === "number") {
        date.setDate(date.getDate() + duration);
    } else if (typeof (duration) === "string") {
        const cleanDuration = duration.toLowerCase().trim();
        if (cleanDuration.includes("month")) {
            const monthsToAdd = parseInt(cleanDuration, 10);
            if (!isNaN(monthsToAdd)) {
                date.setMonth(date.getMonth() + monthsToAdd);
            }
        }
        else if (!isNaN(cleanDuration)) {
            const daysToAdd = parseInt(cleanDuration, 10);
            date.setDate(date.getDate() + daysToAdd);
        } else {
            console.log("Invalid string format received:", duration);
            return "";
        }
    } else {
        console.log("Unknown data type received:", typeof duration);
        return "";
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
};

const calculateRemainingDays = (expiry_date) => {
    if (!expiry_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

function Member() {

    const [member, setMember] = useState(INITIAL_STATE);
    const [filter, setFilter] = useState(INITIAL_FILTERS);

    const [messagType, setMessagType] = useState("payment");
    const [messageMember, setMessageMember] = useState(null);

    const [data, setData] = useState([]);
    const [plans, setPlans] = useState([]);

    const [modal, setModal] = useState({ action: false, delete: false, send: false });
    const [modalMode, setModalMode] = useState("add");
    const [loading, setLoading] = useState({ table: false, modal: false, add: false, edit: false, delete: false, excel: false });
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [id, setId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(totalRows / itemsPerPage);
    const startingSerialNumber = (currentPage - 1) * itemsPerPage;

    const searchTimeoutRef = useRef(null);

    const formatExcelDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "N/A";
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
    };

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
            console.error("Error during fetch plan data:", error);
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = type === "checkbox" ? checked : value;
        if (name === "phone") {
            finalValue = value.replace(/\D/g, "");
            if (finalValue.length > 10) return;
        }
        if (name === "pay_amount") {
            const currentTotal = Number(member.total_amount) || 0;
            if (Number(finalValue) > currentTotal) {
                return;
            }
        }
        setMember(prev => {
            const updatedMember = { ...prev, [name]: finalValue };
            if (name === "plan_id") {
                const selectedPlan = plans.find(p => String(p.id) === String(finalValue));
                if (selectedPlan) {
                    updatedMember.total_amount = Number(selectedPlan.price) || 0;
                } else {
                    updatedMember.total_amount = 0;
                }
                updatedMember.pay_amount = 0;
            }
            if (name === "total_amount") {
                const newTotal = Number(finalValue) || 0;
                if (Number(updatedMember.pay_amount) > newTotal) {
                    updatedMember.pay_amount = newTotal;
                }
            }
            if (name === "joining_date" || name === "plan_id") {
                const selectedPlan = plans.find(p => String(p.id) === String(updatedMember.plan_id));
                let targetDuration = "";
                if (selectedPlan) {
                    targetDuration = selectedPlan.duration !== "custom" ? selectedPlan.duration : selectedPlan.custom_days;
                }
                const newExpiry = calculateExpiryDate(updatedMember.joining_date, targetDuration);
                updatedMember.expiry_date = newExpiry;
                updatedMember.remaining_days = calculateRemainingDays(newExpiry);
            }
            const total = updatedMember.total_amount === "" ? 0 : Number(updatedMember.total_amount) || 0;
            const pay = updatedMember.pay_amount === "" ? 0 : Number(updatedMember.pay_amount) || 0;
            const remaining = total - pay;
            updatedMember.remaining_amount = remaining < 0 ? 0 : remaining;
            if (total === 0) {
                updatedMember.payment_status = "";
            }
            else if (total === pay) {
                updatedMember.payment_status = "complete";
            }
            else if (pay === 0) {
                updatedMember.payment_status = "due";
            }
            else if (pay > 0 && remaining > 0) {
                updatedMember.payment_status = "partial";
            }
            return updatedMember;
        });
    };

    const validation = useMemo(() => {
        const isNameValid = member.name?.trim().length > 0;
        const isPhoneValid = member.phone && member.phone.trim().length === 10;
        const isGenderValid = member.gender !== "";
        const isJoiningDateValid = member.joining_date !== "";
        const isTotalAmountValid = member.total_amount !== "";
        const isPayAmountValid = member.pay_amount !== "";
        return {
            isValid: isNameValid && isPhoneValid && isGenderValid && isJoiningDateValid && isTotalAmountValid && isPayAmountValid,
            errors: {
                name: isSubmitted && !isNameValid,
                phone: isSubmitted && !isPhoneValid,
                gender: isSubmitted && !isGenderValid,
                joiningDate: isSubmitted && !isJoiningDateValid,
                total_amount: isSubmitted && !isTotalAmountValid,
                pay_amount: isSubmitted && !isPayAmountValid,
            }
        };
    }, [member, isSubmitted]);

    const handleForm = async (e) => {
        e.preventDefault();
        setIsSubmitted(true);
        if (!validation.isValid) return;
        if (id) {
            setLoading(prev => ({ ...prev, edit: true }));
        } else {
            setLoading(prev => ({ ...prev, add: true }));
        }
        try {
            const memberId = id || "new";
            const res = await fetch(`/admin/actionmember/${memberId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(member)
            });
            const resData = await res.json();
            if (!res.ok) {
                toast(resData.message, { type: "error" });
            } else {
                if (id) {
                    handleFetch(filter, currentPage);
                } else {
                    setFilter(INITIAL_FILTERS);
                    setCurrentPage(1);
                    handleFetch(INITIAL_FILTERS, 1);
                }
                setModal(prev => ({ ...prev, action: false }));
                toast(resData.message, { type: "success" });
            }
        } catch (error) {
            toast("Network error, please check your internet", { type: "error" });
            console.error("Error during action in member data:", error);
        } finally {
            if (id) {
                setLoading(prev => ({ ...prev, edit: false }));
            } else {
                setLoading(prev => ({ ...prev, add: false }));
            }
        }
    }

    const fetchByID = useCallback(async (id) => {
        setLoading(prev => ({ ...prev, modal: true }));
        try {
            const res = await fetch(`/admin/fetchmemberbyid/${id}`, {
                credentials: "include"
            });
            const resData = await res.json();
            if (!res.ok) {
                toast(resData.message, { type: "error" });
            } else {
                setMember(resData.data);
            }
        } catch (error) {
            toast("Network error, please check your internet", { type: "error" });
            console.error("Error during fetch member data by id:", error);
        } finally {
            setLoading(prev => ({ ...prev, modal: false }));
        }
    }, []);

    const handleDelete = async () => {
        if (selectedIds.length === 0) return;
        setLoading(prev => ({ ...prev, delete: true }));
        try {
            const res = await fetch("/admin/deletemembers", {
                method: "POST",
                credentials: "include",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            const resData = await res.json();
            if (!res.ok) {
                toast(resData.message, { type: "error" });
            } else {
                setSelectedIds([]);
                const isPageEmptyAfterDelete = data.length === selectedIds.length;
                const nextPage = (currentPage > 1 && isPageEmptyAfterDelete) ? currentPage - 1 : currentPage;
                if (nextPage !== currentPage) {
                    setCurrentPage(nextPage);
                }
                handleFetch(filter, nextPage);
                setModal(prev => ({ ...prev, delete: false }));
                toast(resData.message, { type: "success" });
            }
        } catch (error) {
            toast("Network error, please check your internet", { type: "error" });
            console.error("Error during delete history data:", error);
        } finally {
            setLoading(prev => ({ ...prev, delete: false }));
        }
    }

    const handleExcel = async () => {
        try {
            setLoading(prev => ({ ...prev, excel: true }));
            const res = await fetch(`/admin/fetchmember`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ...filter, limit: 'ALL', offset: 0 })
            });
            const resData = await res.json();
            if (!res.ok) {
                if (res.status === 404) {
                    toast("No data found to export", { type: "info" });
                } else {
                    toast(resData.message, { type: "error" });
                }
                return;
            } else {
                const excelRows = resData.data.map((member, index) => ({
                    "S.No.": index + 1,
                    "Member ID": `FIT-${member.id.toString().padStart(3, '0')}`,
                    "Name": member.name,
                    "Phone Number": member.phone,
                    "Gender": member.gender,
                    "Plan Name": getPlanName(member.plan_id),
                    "Payment Status": member.payment_status,
                    "Joining Date": formatExcelDate(member.joining_date),
                    "Expiry Date": formatExcelDate(member.expiry_date),
                    "Remaining Days": member.remaining_days != null ? member.remaining_days : "N/A"
                }));
                const worksheet = XLSX.utils.json_to_sheet(excelRows);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Members List");
                const fileName = `Members_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
                XLSX.writeFile(workbook, fileName);
                toast("Excel Sheet Downloaded!", { type: "success" });
            }
        } catch (error) {
            toast("Network error, please check your internet", { type: "error" });
            console.error("Error during download excel sheet:", error);
        } finally {
            setLoading(prev => ({ ...prev, excel: false }));
        }
    };

    const handleAction = (mode, id) => {
        setIsSubmitted(false);
        setId(id);
        setModal(prev => ({ ...prev, action: true }));
        setModalMode(mode);
        if (mode === "edit" || mode === "view") {
            fetchByID(id);
        } else {
            setMember(INITIAL_STATE);
        }
    };

    const handleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = data.map(dt => dt.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const closeModal = () => {
        setMember(INITIAL_STATE);
        setId(null);
        setIsSubmitted(false);
        setModal(prev => ({ ...prev, action: false }));
    }

    const handleDeleteModal = (type, modal, id) => {
        if (type === "single") {
            setSelectedIds([id]);
        }
        if (!modal) {
            setSelectedIds([]);
        }
        setModal(prev => ({ ...prev, delete: modal }));
    }

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

    const renderPaymentStatus = (payment_status) => {
        let alertClass = "";
        if (!payment_status) {
            alertClass = "secondary";
        } else if (payment_status === "complete") {
            alertClass = "success";
        } else if (payment_status === "partial") {
            alertClass = "warning";
        } else if (payment_status === "due") {
            alertClass = "danger";
        }
        return <span className={`d-inline-block alert alert-${alertClass} py-1 m-0`}>{payment_status ? payment_status : "N/A"}</span>;
    }

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

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB').replace(/\//g, '-');
    };

    const MembershipStatusAlert = ({ planID, expiryDate, remainingDays, isPaused }) => {
        if (!planID) {
            return (
                <div className="alert alert-warning text-center p-3 mb-0">
                    <span className="fw-bold" style={{ fontSize: '1rem' }}>No active plan selected</span>
                </div>
            );
        }

        const formattedDate = formatDate(expiryDate);
        const days = remainingDays;

        if (isPaused) {
            const pauseText = days > 0 ? `${days} ${days === 1 ? 'day is' : 'days are'} currently on hold` : "Plan is on hold";
            return (
                <div className="alert alert-secondary text-center p-3 mb-0">
                    <div className="fw-bold" style={{ fontSize: '1.15rem' }}>Membership Frozen</div>
                    <div className="text-muted" style={{ fontSize: '0.95rem' }}>{pauseText}</div>
                </div>
            );
        }

        let boxClass = "alert-success";
        let mainStatusText = `${days} days left`;
        let subDetailText = `Membership expires on: ${formattedDate}`;

        if (days < 0) {
            const absDays = Math.abs(days);
            boxClass = "alert-danger";
            mainStatusText = `Expired ${absDays} ${absDays === 1 ? "day" : "days"} ago`;
            subDetailText = `Plan ended on: ${formattedDate}`;
        } else if (days === 0) {
            boxClass = "alert-danger";
            mainStatusText = "Expires today";
            subDetailText = `Final day of membership: ${formattedDate}`;
        } else if (days <= 3) {
            boxClass = "alert-warning";
            mainStatusText = days === 1 ? "Only 1 day left!" : `Only ${days} days left!`;
        }

        return (
            <div className={`alert ${boxClass} p-3 mb-0 text-center shadow-sm`}>
                <div className="fw-bold" style={{ fontSize: '1.15rem' }}>{mainStatusText}</div>
                <div className="text-muted" style={{ fontSize: '0.95rem' }}>{subDetailText}</div>
            </div>
        );
    }

    const getPlanName = (planId) => {
        if (!planId) return "No Plan";
        const foundPlan = plans.find(p => String(p.id) === String(planId));
        return foundPlan ? foundPlan.name : "No Plan";
    };

    const hasActiveFilters = Object.values(filter).some(value => value.trim() !== "");

    const modalTitles = {
        add: 'Add New Member',
        edit: 'Edit Member Details',
        view: 'Member Profile Details'
    };

    return (
        <>
            <div id="admin-section" className="container-fluid">
                <div className="bg-white shadow-sm rounded-3 p-4 mx-0">
                    <div className="row g-3 align-items-center mb-4">
                        <div className="col-lg-6 col-12 position-relative">
                            <input placeholder="Search by member ID, name, phone number..." type="text" name="search" value={filter.search} onChange={handleFilterChange} className="form-control shadow-none pe-5" />
                            <img className="search-icon position-absolute top-50 translate-middle-y end-0 me-3" src="/media/icons/search.png" alt="search-icon" />
                        </div>
                        <div className="col-lg-3 col-sm-6 col-12">
                            <button onClick={() => handleAction("add")} className="btn form-control text-uppercase fw-bold shadow-none green-btn py-2">
                                add member
                            </button>
                        </div>
                        <div className="col-lg-3 col-sm-6 col-12">
                            <button disabled={!hasActiveFilters} onClick={handleClearFilters} className="btn form-control text-uppercase fw-bold shadow-none grey-btn py-2">
                                clear all filters
                            </button>
                        </div>
                    </div>
                    <div className="row g-3 align-items-center">
                        <div className="col-xl-3 col-md-6 col-12">
                            <select name="gender" value={filter.gender} onChange={handleFilterChange} className="form-select shadow-none">
                                <option value="">All Genders</option>
                                {FILTER_FIELDS.gender.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-xl-3 col-md-6 col-12">
                            <select name="payment" value={filter.payment} onChange={handleFilterChange} className="form-select shadow-none">
                                <option value="">All Payments</option>
                                {FILTER_FIELDS.payment.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-xl-3 col-md-6 col-12">
                            <select name="member" value={filter.member} onChange={handleFilterChange} className="form-select shadow-none">
                                <option value="">All Members</option>
                                {FILTER_FIELDS.member.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-xl-3 col-md-6 col-12">
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
                    </div>
                </div>

                <div style={{ marginTop: selectedIds.length > 0 ? "3rem" : "1rem", transition: "margin-top 0.3s ease-in-out" }} className="row mx-0">
                    <div className="col-lg-3 col-md-4 col-6 px-0">
                        <button style={{ pointerEvents: selectedIds.length > 0 ? "auto" : "none", transition: "all 0.3s ease-in-out" }} onClick={() => handleDeleteModal("multi", true)} className={`btn form-control text-uppercase fw-bold shadow-none black-btn multi-delete-btn ${selectedIds.length > 0 ? "show" : "hide"}`}>delete selected ({selectedIds.length})</button>
                    </div>
                    <div className="col-12 overflow-hidden shadow-sm rounded-3 mt-3 px-0">
                        <div className="table-responsive">
                            <table className={`table text-center table-bordered align-middle ${data.length !== 0 ? "table-hover" : ""} mb-0`}>
                                <thead className="text-uppercase align-middle">
                                    <tr>
                                        <th>
                                            {data.length > 0 && (
                                                <input type="checkbox" onChange={handleSelectAll} checked={data.length > 0 && selectedIds.length === data.length} className="me-1" />
                                            )} all
                                        </th>
                                        <th>s.no.</th>
                                        <th>id</th>
                                        <th>name</th>
                                        <th>phone</th>
                                        <th>gender</th>
                                        <th>plan</th>
                                        <th>payment</th>
                                        <th>expiry</th>
                                        <th>action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading.table ? (
                                        <tr>
                                            <td colSpan={10} className="py-2"><div className="table-spinner spinner mx-auto"></div></td>
                                        </tr>
                                    ) : data.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-uppercase fw-bold text-muted">no data</td>
                                        </tr>
                                    ) : (
                                        data.map((member, index) => (
                                            <tr key={member.id}>
                                                <td><input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => handleSelect(member.id)} /></td>
                                                <td>{startingSerialNumber + index + 1}</td>
                                                <td>FIT-{String(member.id).padStart(3, '0')}</td>
                                                <td className="text-capitalize">{member.name}</td>
                                                <td>{member.phone}</td>
                                                <td>{member.gender}</td>
                                                <td>{getPlanName(member.plan_id)}</td>
                                                <td className="text-capitalize">{renderPaymentStatus(member.payment_status)}</td>
                                                <td>{renderRemainingDays(member)}</td>
                                                <td>
                                                    <div className="d-flex justify-content-center gap-3">
                                                        <button onClick={() => handleAction("edit", member.id)} className="d-flex btn px-3 py-2 edit-btn">
                                                            <img className="action-icon" src="/media/icons/edit.png" alt="edit-icon" />
                                                        </button>
                                                        <button onClick={() => handleDeleteModal("single", true, member.id)} className="d-flex btn px-3 py-2 delete-btn">
                                                            <img className="action-icon" src="/media/icons/delete.png" alt="delete-icon" />
                                                        </button>
                                                        <button onClick={() => handleAction("view", member.id)} className="d-flex btn px-3 py-2 view-btn">
                                                            <img className="action-icon" src="/media/icons/view.png" alt="view-icon" />
                                                        </button>
                                                        <button disabled={member.payment_status === "complete" && !member.plan_id} onClick={() => handleSendModal(member.phone, member.name, member.remaining_days, member.payment_status)} className="d-flex btn px-3 py-2 send-btn">
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
                {data.length > 0 && (
                    <div className="row align-items-center mt-4">
                        <div className="offset-md-3 col-md-6 col-12 d-flex justify-content-center align-items-center">
                            <button disabled={currentPage === 1 || loading.table} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="d-flex btn fw-bold text-uppercase shadow-sm page-btn px-3 py-2">prev</button>
                            <p className="fw-bold mx-4 my-0">{currentPage}/{totalPages || 1}</p>
                            <button disabled={currentPage === totalPages || totalPages === 0 || loading.table} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="d-flex btn fw-bold text-uppercase shadow-sm page-btn px-3 py-2">next</button>
                        </div>
                        <div className="col-md-3 col-12 mt-md-0 mt-4">
                            <button onClick={handleExcel} disabled={loading.excel || data.length === 0} className="btn form-control text-uppercase fw-bold shadow-none green-btn">{loading.excel ? <div className="excel-spinner spinner mx-auto"></div> : "download excel"}</button>
                        </div>
                    </div>
                )}
            </div>

            {modal.action &&
                <section id="action-modal-section" className="position-fixed top-0 bottom-0 start-0 end-0 z-1 d-flex align-items-center">
                    <div className="container">
                        <div className="row justify-content-center">
                            <div className="col-lg-8 col-12 action-modal-div position-relative shadow-sm rounded-3 p-5">
                                <button onClick={closeModal} className='close-btn d-flex justify-content-center align-items-center position-absolute rounded-circle p-0'>
                                    <img className="close-icon" src="/media/icons/close.png" alt="close icon" />
                                </button>
                                <h2 className="text-center text-uppercase fw-bold">{modalTitles[modalMode]}</h2>
                                <div className="modal-body px-sm-3 mt-4">
                                    {loading.modal ? (
                                        <div className="modal-spinner spinner mx-auto"></div>
                                    ) : (
                                        <form onSubmit={handleForm}>
                                            <div className={`row ${validation.errors.name || validation.errors.phone ? "mb-md-3" : "mb-md-4"}`}>
                                                <div className={`col-md-6 col-12 mb-md-0 ${validation.errors.name ? "mb-2" : "mb-3"}`}>
                                                    <label className="form-label">Member Name {modalMode !== "view" && <span className="text-danger">*</span>}</label>
                                                    <input disabled={modalMode === "view"} name="name" value={member.name} onChange={handleChange} type="text" className={`form-control shadow-none ${validation.errors.name ? "is-invalid" : ""}`} placeholder="e.g., Mohit Soni" />
                                                    <div className="invalid-feedback">
                                                        Member name is required
                                                    </div>
                                                </div>
                                                <div className={`col-md-6 col-12 mb-md-0 ${validation.errors.phone ? "mb-2" : "mb-3"}`}>
                                                    <label className="form-label">Phone Number (+91) {modalMode !== "view" && <span className="text-danger">*</span>}</label>
                                                    <input disabled={modalMode === "view"} name="phone" value={member.phone} onChange={handleChange} type="text" className={`form-control shadow-none ${validation.errors.phone ? "is-invalid" : ""}`} placeholder="e.g., 7737008346" />
                                                    <div className="invalid-feedback">
                                                        {member.phone.trim().length === 0 ? "Phone number is required" : "Phone number must be exactly 10 digits"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`row ${validation.errors.joiningDate ? "mb-md-3" : "mb-md-4"}`}>
                                                <div className="col-md-6 col-12 mb-md-0 mb-3">
                                                    <label className="form-label">Select Membership Plan</label>
                                                    {modalMode === "view" ? (
                                                        <input disabled value={getPlanName(member.plan_id)} className="form-control shadow-none" />
                                                    ) : (
                                                        <select name="plan_id" value={member.plan_id || ""} onChange={handleChange} className="form-select shadow-none" >
                                                            <option value="">Select a Plan</option>
                                                            {plans.filter(dt => dt.is_active === true || dt.is_active === 'true').map((dt) => (
                                                                <option key={dt.id} value={dt.id}>{dt.name} ({dt.duration !== "custom" ? dt.duration : `${dt.custom_days} ${dt.custom_days > 1 ? "days" : "day"}`})</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                                <div className={`col-md-6 col-12 mb-md-0 ${validation.errors.joiningDate ? "mb-2" : "mb-3"}`}>
                                                    <label className="form-label">Joining Date {modalMode !== "view" && <span className="text-danger">*</span>}</label>
                                                    <input disabled={modalMode === "view"} name="joining_date" value={member.joining_date} onChange={handleChange} type="date" className={`form-control shadow-none ${validation.errors.joiningDate ? "is-invalid" : ""}`} />
                                                    {validation.errors.joiningDate && <div className="invalid-feedback">Joining Date is required</div>}
                                                </div>
                                            </div>
                                            <div className={`row ${validation.errors.total_amount || validation.errors.pay_amount ? "mb-md-3" : "mb-md-4"}`}>
                                                <div className={`col-md-4 col-12 mb-md-0 ${validation.errors.total_amount ? "mb-2" : "mb-3"}`}>
                                                    <label className="form-label">{member.plan_id ? "Plan Price" : "Custom Price"} (₹) {modalMode !== "view" && <span className="text-danger">*</span>}</label>
                                                    <input disabled={modalMode === "view" || member.plan_id} name="total_amount" value={member.total_amount} onChange={handleChange} type="number" className={`form-control shadow-none ${validation.errors.total_amount ? "is-invalid" : ""}`} placeholder="0" />
                                                    <div className="invalid-feedback">
                                                        Total price is required
                                                    </div>
                                                </div>
                                                <div className={`col-md-4 col-12 mb-md-0 ${validation.errors.pay_amount ? "mb-2" : "mb-3"}`}>
                                                    <label className="form-label">Pay Amount (₹) {modalMode !== "view" && <span className="text-danger">*</span>}</label>
                                                    <input disabled={modalMode === "view"} name="pay_amount" value={member.pay_amount} onChange={handleChange} type="number" className={`form-control shadow-none ${validation.errors.pay_amount ? "is-invalid" : ""}`} placeholder="0" />
                                                    <div className="invalid-feedback">
                                                        Pay amount is required
                                                    </div>
                                                </div>
                                                <div className="col-md-4 col-12 mb-md-0 mb-3">
                                                    <label className="form-label">Remaining Amount (₹)</label>
                                                    <input disabled name="remaining_amount" value={member.remaining_amount} onChange={handleChange} type="number" className="form-control shadow-none" />
                                                </div>
                                            </div>
                                            <div className={`row ${validation.errors.gender ? "mb-md-3" : "mb-md-4"}`}>
                                                <div className={`col-md-6 col-12 mb-md-0 ${validation.errors.gender ? "mb-2" : "mb-3"}`}>
                                                    <label className="form-label d-block">Gender {modalMode !== "view" && <span className="text-danger">*</span>}</label>
                                                    {modalMode === "view" ?
                                                        <div className="form-check form-check-inline">
                                                            <input className="form-check-input shadow-none" type="radio" defaultChecked />
                                                            <label className="form-check-label">{member.gender}</label>
                                                        </div>
                                                        :
                                                        <>
                                                            <div className="form-check form-check-inline me-4">
                                                                <input className={`form-check-input ${validation.errors.gender ? "is-invalid" : ""}`} type="radio" name="gender" id="genderMale" value="Male" checked={member.gender === "Male"} onChange={handleChange} />
                                                                <label className="form-check-label" htmlFor="genderMale">Male</label>
                                                            </div>
                                                            <div className="form-check form-check-inline">
                                                                <input className={`form-check-input ${validation.errors.gender ? "is-invalid" : ""}`} type="radio" name="gender" id="genderFemale" value="Female" checked={member.gender === "Female"} onChange={handleChange} />
                                                                <label className="form-check-label" htmlFor="genderFemale">Female</label>
                                                            </div>
                                                        </>
                                                    }

                                                    {validation.errors.gender && <div className="invalid-feedback d-block">Gender is required</div>}
                                                </div>
                                                <div className="col-md-6 col-12 mb-md-0 mb-3">
                                                    <label className="form-label d-block">Payment Status</label>
                                                    {modalMode === "view" ? (member.payment_status ?
                                                        <div className="form-check form-check-inline">
                                                            <input className="form-check-input shadow-none" type="radio" defaultChecked />
                                                            <label className="form-check-label text-capitalize">{member.payment_status}</label>
                                                        </div>
                                                        : "N/A")
                                                        :
                                                        <>
                                                            <div className="form-check form-check-inline me-4">
                                                                <input disabled className="form-check-input" type="radio" name="payment_status" id="paymentComplete" value="complete" checked={member.payment_status === "complete"} onChange={handleChange} />
                                                                <label className="form-check-label" htmlFor="paymentComplete">Complete</label>
                                                            </div>
                                                            <div className="form-check form-check-inline me-4">
                                                                <input disabled className="form-check-input" type="radio" name="payment_status" id="paymentPartial" value="partial" checked={member.payment_status === "partial"} onChange={handleChange} />
                                                                <label className="form-check-label" htmlFor="paymentPartial">Partial</label>
                                                            </div>
                                                            <div className="form-check form-check-inline">
                                                                <input disabled className="form-check-input" type="radio" name="payment_status" id="paymentDue" value="due" checked={member.payment_status === "due"} onChange={handleChange} />
                                                                <label className="form-check-label" htmlFor="paymentDue">Due</label>
                                                            </div>
                                                        </>
                                                    }
                                                </div>
                                            </div>
                                            {member.plan_id && member.remaining_days > 0 && modalMode !== "add" && (
                                                <div className="row mb-md-4 mb-3">
                                                    <div className="col-12">
                                                        {modalMode === "view" ?
                                                            <div className="form-check form-switch">
                                                                <input readOnly className="form-check-input shadow-none" type="checkbox" checked={member.is_paused || false} />
                                                                <label className="form-check-label">{member.is_paused ? "Membership Freezed" : "Freeze Membership"}</label>
                                                            </div>
                                                            :
                                                            <div className="form-check form-switch">
                                                                <input className="form-check-input" type="checkbox" id="pauseMembership" name="is_paused" onChange={handleChange} checked={member.is_paused || false} />
                                                                <label className="form-check-label" htmlFor="pauseMembership">{member.is_paused ? "Membership Freezed" : "Freeze Membership"}</label>
                                                            </div>
                                                        }
                                                    </div>
                                                </div>
                                            )}
                                            <MembershipStatusAlert planID={member.plan_id} expiryDate={member.expiry_date} remainingDays={member.remaining_days} isPaused={member.is_paused} />
                                            <div className="d-flex mt-4">
                                                {modalMode !== "view" ?
                                                    <button type="submit" disabled={modalMode === "add" ? loading.add : loading.edit} className="btn text-uppercase fw-bold shadow-none form-control black-btn">
                                                        {(modalMode === "add" ? loading.add : loading.edit) ? (
                                                            <div className="action-spinner spinner mx-auto"></div>
                                                        ) : (
                                                            modalMode === "add" ? "add member" : "save changes"
                                                        )}
                                                    </button>
                                                    :
                                                    <button onClick={closeModal} type="submit" className="btn text-uppercase fw-bold shadow-none form-control black-btn">done</button>
                                                }
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            }

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

            <DeleteModal isOpen={modal.delete} isLoading={loading.delete} itemCount={selectedIds.length} onClose={() => handleDeleteModal(false)} onConfirm={handleDelete} title={"Member"} />
        </>
    );
}

export default Member;