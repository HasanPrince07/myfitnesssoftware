import { useNavigate } from "react-router-dom";
import "./Common.css";

function Notfound() {

    const navigate = useNavigate();

    return (
        <>
            <main id="notfound-section" className="d-flex align-items-center">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <h1 className="fw-bold text-center">404</h1>
                            <h2 className="fw-bold text-center">Oops! This Page Not Found</h2>
                            <p className="text-center">The URL may be incorrect or this page no longer exists. Use the buttons below to go to the correct place.</p>
                            <div className="d-flex justify-content-center mt-3">
                                <button className="btn col-lg-2 col-md-4 col-6 text-uppercase fw-bold btn1" onClick={() => navigate("/")}>back to home</button>
                                <button className="btn col-lg-2 col-md-4 col-6 text-uppercase fw-bold btn2 ms-2" onClick={() => navigate(-1)}>go back</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

export default Notfound;