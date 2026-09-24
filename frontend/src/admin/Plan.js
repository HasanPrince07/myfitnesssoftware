import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import * as XLSX from 'xlsx';
import DeleteModal from "../common/DeleteModal";
import "./Admin.css";
// kya 0 rupees wala plan add krne dena chahiye


const INITIAL_STATE = { name: "", price: "", duration: "", custom_days: 0, description: "", is_active: true }
const INITIAL_FILTERS = { search: "", duration: "", status: "" }

const FILTER_FIELDS = {
    duration: [
        { value: "1_month", label: "1 Month" },
        { value: "3_months", label: "3 Month (Quaterly)" },
        { value: "6_months", label: "6 Month (Half-Yearly)" },
        { value: "12_months", label: "12 Month (Yearly)" },
        { value: "custom", label: "Custom Days" }
    ],
    status: [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" }
    ]
};

function Plan() {

    const [plan, setPlan] = useState(INITIAL_STATE);
    const [filter, setFilter] = useState(INITIAL_FILTERS);
    const [data, setData] = useState([]);
    const [modal, setModal] = useState({ action: false, delete: false, information: false });
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

    const handleFetch = useCallback(async (currentFilters, page) => {
        setLoading(prev => ({ ...prev, table: true }));
        try {
            const limit = itemsPerPage;
            const offset = (page - 1) * itemsPerPage;
            const res = await fetch(`/admin/fetchplan`, {
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
            console.error("Error during fetch plan data:", error);
        } finally {
            setLoading(prev => ({ ...prev, table: false }));
        }
    }, []);

    useEffect(() => {
        handleFetch(filter, currentPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleFetch, currentPage]);

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
        if (name === "price" || name === "custom_days") {
            finalValue = value.replace(/\D/g, "");
            if (name === "price" && finalValue.length > 10) return;
            if (name === "custom_days" && finalValue.length > 3) return;
        }
        setPlan(prev => {
            const updated = { ...prev, [name]: finalValue };
            if (name === "duration" && value !== "custom") {
                updated.custom_days = "";
            }
            return updated;
        });
    };

    const validation = useMemo(() => {
        const isNameValid = plan.name?.trim().length > 0;
        const isPriceValid = plan.price !== undefined && plan.price !== null && String(plan.price).trim().length > 0;
        const isDurationValid = plan.duration && plan.duration.trim().length !== 0;
        const isCustomDaysValid = plan.duration === "custom" ? (
            plan.custom_days !== undefined &&
            plan.custom_days !== null &&
            (typeof plan.custom_days === 'string' ? plan.custom_days.trim().length > 0 : true) &&
            parseInt(plan.custom_days) > 0
        ) : true;
        return {
            isValid: isNameValid && isPriceValid && isDurationValid && isCustomDaysValid,
            errors: {
                name: isSubmitted && !isNameValid,
                price: isSubmitted && !isPriceValid,
                duration: isSubmitted && !isDurationValid,
                customDays: isSubmitted && !isCustomDaysValid
            }
        };
    }, [plan, isSubmitted]);

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
            const planId = id || "new";
            const res = await fetch(`/admin/actionplan/${planId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(plan)
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
            const res = await fetch(`/admin/fetchplanbyid/${id}`, {
                credentials: "include"
            });
            const resData = await res.json();
            if (!res.ok) {
                toast(resData.message, { type: "error" });
            } else {
                setPlan(resData.data);
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
            const res = await fetch("/admin/deleteplans", {
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
            const res = await fetch(`/admin/fetchplan`, {
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
                const excelRows = resData.data.map((plan, index) => ({
                    "S.No.": index + 1,
                    "Plan Name": plan.name,
                    "Price (₹)": plan.price,
                    "Duration": plan.duration === "custom" ? `${plan.custom_days} Days` : plan.duration,
                    "Total Members": plan.total_members || 0,
                    "Created At": formatDate(plan.created_at),
                    "Status": plan.is_active ? "Active" : "Inactive",
                    "Description": plan.description
                }));
                const worksheet = XLSX.utils.json_to_sheet(excelRows);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Plan List");
                const fileName = `Plans_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
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
            setPlan(INITIAL_STATE);
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
        setPlan(INITIAL_STATE);
        setId(null);
        setIsSubmitted(false);
        setModal(prev => ({ ...prev, action: false }));
    }

    const handleDeleteModal = (type, modal, id, memberCount) => {
        if (type === "single") {
            setSelectedIds([id]);
        }
        if (type === "single" && memberCount > 0) {
            setModal(prev => ({ ...prev, information: modal }));
            return;
        }
        if (type === "multi" && modal === true) {
            const hasMembers = data.filter(plan => selectedIds.includes(plan.id)).some(plan => plan.total_members > 0);
            if (hasMembers) {
                setModal(prev => ({ ...prev, information: modal }));
                return;
            }
        }
        if (!modal) {
            setSelectedIds([]);
        }
        setModal(prev => ({ ...prev, delete: modal }));
    }

    const closeInformationModal = () => {
        setSelectedIds([]);
        setModal(prev => ({ ...prev, information: false }));
    }

    const formatDuration = (duration, customDays) => {
        if (duration === 'custom') {
            const unit = parseInt(customDays, 10) === 1 ? 'Day' : 'Days';
            return `${customDays} ${unit}`;
        }
        return duration.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB').replace(/\//g, '-');
    };

    const hasActiveFilters = Object.values(filter).some(value => value.trim() !== "");

    const modalTitles = {
        add: 'Add New Plan',
        edit: 'Edit Plan Details',
        view: 'Plan Details'
    };

    return (
        <>
            <div id="admin-section" className="container-fluid">
                <div className="bg-white shadow-sm rounded-3 p-4 mx-0">
                    <div className="row g-3 align-items-center mb-4">
                        <div className="col-lg-6 col-12 position-relative">
                            <input placeholder="Search by plan name, duration..." type="text" name="search" value={filter.search} onChange={handleFilterChange} className="form-control shadow-none pe-5" />
                            <img className="search-icon position-absolute top-50 translate-middle-y end-0 me-3" src="/media/icons/search.png" alt="search-icon" />
                        </div>
                        <div className="col-lg-3 col-sm-6 col-12">
                            <button onClick={() => handleAction("add")} className="btn form-control text-uppercase fw-bold shadow-none green-btn py-2">
                                add plan
                            </button>
                        </div>
                        <div className="col-lg-3 col-sm-6 col-12">
                            <button disabled={!hasActiveFilters} onClick={handleClearFilters} className="btn form-control text-uppercase fw-bold shadow-none grey-btn py-2">
                                clear all filters
                            </button>
                        </div>
                    </div>
                    <div className="row g-3 align-items-center">
                        <div className="col-md-6 col-12">
                            <select name="duration" value={filter.duration} onChange={handleFilterChange} className="form-select shadow-none">
                                <option value="">All Duration</option>
                                {FILTER_FIELDS.duration.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6 col-12">
                            <select name="status" value={filter.status} onChange={handleFilterChange} className="form-select shadow-none">
                                <option value="">All Status</option>
                                {FILTER_FIELDS.status.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: selectedIds.length > 0 ? "3rem" : "1rem", transition: "margin-top 0.3s ease-in-out" }}
                    className="row mx-0">
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
                                        <th>name</th>
                                        <th>price</th>
                                        <th>duration</th>
                                        <th>members</th>
                                        <th>created at</th>
                                        <th>status</th>
                                        <th>action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading.table ? (
                                        <tr>
                                            <td colSpan={9} className="py-2"><div className="table-spinner spinner mx-auto"></div></td>
                                        </tr>
                                    ) : data.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-uppercase fw-bold text-muted">no data</td>
                                        </tr>
                                    ) : (
                                        data.map((plan, index) => (
                                            <tr key={plan.id}>
                                                <td><input type="checkbox" checked={selectedIds.includes(plan.id)} onChange={() => handleSelect(plan.id)} /></td>
                                                <td>{startingSerialNumber + index + 1}</td>
                                                <td className="text-capitalize">{plan.name}</td>
                                                <td>₹ {plan.price}</td>
                                                <td>{formatDuration(plan.duration, plan.custom_days)}</td>
                                                <td>{plan.total_members || 0}</td>
                                                <td>{formatDate(plan.created_at)}</td>
                                                <td>
                                                    <span className={`d-inline-block alert ${plan.is_active ? "alert-success" : "alert-danger"} py-1 px-2 m-0`}>{plan.is_active ? "Active" : "Inactive"}</span>
                                                </td>
                                                <td>
                                                    <div className="d-flex justify-content-center gap-3">
                                                        <button onClick={() => handleAction("edit", plan.id)} className="d-flex btn px-3 py-2 edit-btn">
                                                            <img className="action-icon" src="/media/icons/edit.png" alt="edit-icon" />
                                                        </button>
                                                        <button onClick={() => handleDeleteModal("single", true, plan.id, plan.total_members)} className="d-flex btn px-3 py-2 delete-btn">
                                                            <img className="action-icon" src="/media/icons/delete.png" alt="delete-icon" />
                                                        </button>
                                                        <button onClick={() => handleAction("view", plan.id)} className="d-flex btn px-3 py-2 view-btn">
                                                            <img className="action-icon" src="/media/icons/view.png" alt="view-icon" />
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
                                            <div className={`row ${validation.errors.name || validation.errors.price ? "mb-md-3" : "mb-md-4"}`}>
                                                <div className={`${modalMode !== "edit" ? "col-md-6" : "col-12"} col-12 mb-md-0 ${validation.errors.name ? "mb-2" : "mb-3"}`}>
                                                    <label className="form-label">Plan Name {modalMode !== "view" && <span className="text-danger">*</span>}</label>
                                                    <input disabled={modalMode === "view"} name="name" value={plan.name} onChange={handleChange} type="text" className={`form-control shadow-none ${validation.errors.name ? "is-invalid" : ""}`} placeholder="e.g., Gold Membership, Quarterly Plan" />
                                                    <div className="invalid-feedback">
                                                        Plan name is required
                                                    </div>
                                                </div>
                                                {modalMode !== "edit" && (
                                                    <div className={`col-md-6 col-12 mb-md-0 ${validation.errors.price ? "mb-2" : "mb-3"}`}>
                                                        <label className="form-label">Plan Price (₹) {modalMode === "add" && <span className="text-danger">*</span>}</label>
                                                        <input disabled={modalMode !== "add"} name="price" value={plan.price} onChange={handleChange} type="text" className={`form-control shadow-none ${validation.errors.price ? "is-invalid" : ""}`} placeholder="e.g., 3000" />
                                                        <div className="invalid-feedback">
                                                            Plan price is required
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {modalMode !== "edit" && (
                                                <div className={`row ${validation.errors.duration || validation.errors.customDays ? "mb-md-3" : "mb-md-4"}`}>
                                                    <div className={`${plan.duration === "custom" ? "col-md-6 col-12" : "col-12"} mb-md-0 ${validation.errors.duration ? "mb-2" : "mb-3"}`}>
                                                        <label className="form-label">Plan Duration {modalMode === "add" && <span className="text-danger">*</span>}</label>
                                                        {modalMode !== "add" ? (
                                                            <input disabled value={plan.duration} className="form-control shadow-none" />
                                                        ) : (
                                                            <select name="duration" value={plan.duration || ""} onChange={handleChange} className={`form-select shadow-none ${validation.errors.duration ? "is-invalid" : ""}`}>
                                                                <option value="">Select Duration</option>
                                                                <option value="1 month">1 Month</option>
                                                                <option value="3 months">3 Months (Quarterly)</option>
                                                                <option value="6 months">6 Months (Half-Yearly)</option>
                                                                <option value="12 months">12 Months (Yearly)</option>
                                                                <option value="custom">Custom Days</option>
                                                            </select>
                                                        )}
                                                        <div className="invalid-feedback">
                                                            Plan duration is required
                                                        </div>
                                                    </div>
                                                    {plan.duration === "custom" && (
                                                        <div className={`col-md-6 col-12 mb-md-0 ${validation.errors.customDays ? "mb-2" : "mb-3"}`}>
                                                            <label className="form-label">Enter Number of Days {modalMode === "add" && <span className="text-danger">*</span>}</label>
                                                            <input disabled={modalMode !== "add"} name="custom_days" value={plan.custom_days || ""} onChange={handleChange} type="text" className={`form-control shadow-none ${validation.errors.customDays ? "is-invalid" : ""}`} placeholder="Enter days (e.g., 30)" />
                                                            <div className="invalid-feedback">
                                                                Number of days is required
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {modalMode === "view" && (
                                                <div className="row mb-md-4">
                                                    <div className="col-md-6 col-12 mb-md-0 mb-3">
                                                        <label className="form-label">Total Members</label>
                                                        <input disabled value={plan.total_members} type="text" className="form-control shadow-none" />
                                                    </div>
                                                    <div className="col-md-6 col-12 mb-md-0 mb-3">
                                                        <label className="form-label">Created At</label>
                                                        <input disabled value={formatDate(plan.created_at)} type="text" className="form-control shadow-none" />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="row mb-md-4 mb-3">
                                                <div className="col-12">
                                                    <label className="form-label">Plan Description</label>
                                                    <textarea rows={3} disabled={modalMode === "view"} name="description" value={modalMode === "view" ? (plan.description && plan.description.trim() !== "" ? plan.description : "No description provided") : plan.description} onChange={handleChange} type="text" className="form-control shadow-none" placeholder="e.g., Access to Gym + Cardio, Includes Personal Trainer for 1 Month"></textarea>
                                                </div>
                                            </div>
                                            {modalMode !== "add" && (
                                                <div className="row mb-md-4 mb-3">
                                                    <div className="col-12">
                                                        {modalMode === "view" ?
                                                            <div className="form-check form-switch">
                                                                <input readOnly className="form-check-input shadow-none" type="checkbox" checked={plan.is_active || false} />
                                                                <label className="form-check-label">{plan.is_active ? "Active" : "Inactive"}</label>
                                                            </div>
                                                            :
                                                            <div className="form-check form-switch">
                                                                <input className="form-check-input" type="checkbox" id="activePlan" name="is_active" onChange={handleChange} checked={plan.is_active || false} />
                                                                <label className="form-check-label" htmlFor="activePlan">{plan.is_active ? "Active" : "Inactive"}</label>
                                                            </div>
                                                        }
                                                    </div>
                                                </div>
                                            )}
                                            <div className="d-flex mt-4">
                                                {modalMode !== "view" ?
                                                    <button type="submit" disabled={modalMode === "add" ? loading.add : loading.edit} className="btn text-uppercase fw-bold shadow-none form-control black-btn">
                                                        {(modalMode === "add" ? loading.add : loading.edit) ? (
                                                            <div className="action-spinner spinner mx-auto"></div>
                                                        ) : (
                                                            modalMode === "add" ? "add plan" : "save changes"
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

            {modal.information &&
                <section id="action-modal-section" className="position-fixed top-0 bottom-0 start-0 end-0 z-1 d-flex align-items-center">
                    <div className="container">
                        <div className="row justify-content-center">
                            <div className="col-xl-6 col-lg-8 col-12 action-modal-div shadow-sm rounded-3 p-5">
                                <div className="d-flex justify-content-center">
                                    <img className="delete-icon" src="/media/icons/alert-img.png" alt="delete-icon" />
                                </div>
                                <h5 className="text-muted text-center mt-4">You cannot delete {selectedIds.length === 1 ? "this plan" : "these plans"} because {selectedIds.length === 1 ? "it has" : "they have"} active members.</h5>
                                <div className="d-flex mt-3">
                                    <button onClick={closeInformationModal} className="btn form-control text-uppercase shadow-none fw-bold black-btn">done</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            }

            <DeleteModal isOpen={modal.delete} isLoading={loading.delete} itemCount={selectedIds.length} onClose={() => handleDeleteModal(false)} onConfirm={handleDelete} title={"Plan"} />
        </>
    );
}

export default Plan;