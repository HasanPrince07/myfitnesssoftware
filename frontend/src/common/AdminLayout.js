import { NavLink, Outlet } from 'react-router-dom';
import "./Common.css";
import { useCallback, useEffect, useState } from 'react';

const LINKS = [
    { name: "dashboard", path: "/admin", src: "dashboard_icon.png" },
    { name: "members", path: "/admin/member", src: "member_icon.png" },
    { name: "plans", path: "/admin/plan", src: "plan_icon.png" },
    { name: "notifications", path: "/admin/notification", src: "notification_icon.png" },
    { name: "staff", path: "/admin/staff", src: "staff_icon.png" },
    { name: "billing", path: "/admin/billing", src: "billing_icon.png" },
    { name: "attendance", path: "/admin/attendence", src: "member_icon.png" },
    { name: "profile", path: "/admin/profile", src: "member_icon.png" },
];

function AdminLayout() {

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [modal, setModal] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 992);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getMainWidth = () => {
        if (isMobile) return "100%";
        return sidebarOpen ? "77%" : "100%";
    };

    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const toggleModal = useCallback(() => setModal(prev => !prev), []);
    const closeModal = useCallback(() => setModal(false), []);

    return (
        <>
            <div className="container-fluid">
                <div className="row position-relative">
                    <div id='sidebar-section' style={{ width: sidebarOpen ? "23%" : "0%", padding: sidebarOpen ? "0px 8px" : "0px" }} className={`d-lg-flex d-none flex-column transition-all`}>
                        <div className='border-bottom px-2 py-3'>
                            <img className='logo' src='/media/logos/logo.png' alt='logo' />
                        </div>
                        <div className='overflow-auto px-2 mt-5'>
                            {LINKS.map((link, index) => (
                                <NavLink key={index} to={link.path} end={link.path === "/admin"} className="d-flex align-items-center text-uppercase fw-bold text-decoration-none my-4 py-2 ps-xl-5 ps-4">
                                    <img className='link-icon me-3' src={`/media/icons/${link.src}`} alt='logo' />
                                    {link.name}
                                </NavLink>
                            ))}
                        </div>
                        <div className='mt-auto px-2 py-5'>
                            <button className='btn d-flex justify-content-center align-items-center form-control text-uppercase fw-bold'>
                                <img className='logout-icon me-3' src='/media/icons/logout.png' alt='logout-icon' />
                                logout
                            </button>
                        </div>
                    </div>
                    <div style={{ width: getMainWidth(), transition: "all 0.3s ease", height: "100vh" }} className="d-flex flex-column p-0">
                        <div id='admin-header-section' className="row align-items-center border-bottom border-2 py-sm-4 py-2 px-sm-3 px-0 m-0">
                            <div className='col-sm-6 col-8 d-flex align-items-center'>
                                {isMobile ?
                                    <button onClick={toggleModal} className='rounded-circle'>
                                        <img className='toggle-icon' src='/media/icons/menu.png' alt='toggle-icon' />
                                    </button>
                                    :
                                    <button onClick={toggleSidebar} className='rounded-circle'>
                                        <img style={{ transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.7s ease" }} className='toggle-icon' src='/media/icons/sidebar.png' alt='toggle-icon' />
                                    </button>
                                }
                                <h5 className='text-capitalize ms-2 m-0'>hello mohammad hasan</h5>
                            </div>
                            <div className='col-sm-6 col-4 d-flex justify-content-end'>
                                <button className='rounded-3 me-2'>
                                    <img className='notification-icon' src='/media/icons/notification_off.png' alt='notification-icon' />
                                </button>
                                <button className='rounded-circle'>
                                    <p className='fw-bold m-0'>MH</p>
                                </button>
                            </div>
                            {(modal && isMobile) ?
                                <div id='modal-section' className='col-12 rounded-3 mt-3 py-2 px-4'>
                                    {LINKS.map((link, index) => (
                                        <NavLink key={index} to={link.path} end={link.path === "/admin"} onClick={closeModal} className="d-flex align-items-center text-uppercase fw-bold text-decoration-none my-2 px-4 py-2">
                                            <img className='link-icon me-3' src={`/media/icons/${link.src}`} alt='logo' />
                                            {link.name}
                                        </NavLink>
                                    ))}
                                </div>
                                : ""}
                        </div>
                        <div style={{ overflowY: "auto", minHeight: "0", flexBasis: "0" }} className="col-12 flex-grow-1 px-2 py-5 bg-light">
                            <main>
                                <Outlet />
                            </main>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AdminLayout;