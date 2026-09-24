import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";
import "./Account.css";

const INITIAL_STATE = { email: "", password: "" };

function Signin() {

    const [data, setData] = useState(INITIAL_STATE);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target
        setData(prev => ({ ...prev, [name]: value }));
    };

    const isEmailEmpty = data.email.trim().length === 0;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailFormatValid = emailRegex.test(data.email.trim());
    const isEmailValid = !isEmailEmpty && isEmailFormatValid;
    const isPasswordValid = data.password.trim().length > 0;
    const isFormValid = isEmailValid && isPasswordValid;

    const handleForm = async (e) => {
        e.preventDefault();
        setIsSubmitted(true);
        if (!isFormValid) return;
        setLoading(true);
        try {
            // const res = await fetch(`/admin/login`, {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     credentials: "include",
            //     body: JSON.stringify(login)
            // });
            // const resData = await res.json();
            // if (res.ok) {
            //     navigate("/dashboard", { state: { message: resData.message } });
            // } else {
            //     toast(resData.message, { type: "error" });
            // }
            navigate("/admin");
        } catch (error) {
            toast("Network error, please check your internet", { type: "error" });
            console.log("Error during login:", error);
        } finally {
            setLoading(false);
        }
    }

    const showEmailError = isSubmitted && !isEmailValid;
    const showPasswordError = isSubmitted && !isPasswordValid;

    return (
        <>
            <main id="account-section" className="d-flex align-items-center">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="account-div col-md-11 col-sm-9 col-10 row align-items-center shadow-sm rounded-3 p-0">
                            <div className="col-md-6 col-12 position-relative img-container-box p-0">
                                <img className="account-img object-fit-cover" src="media/images/signin_wall.jpg" alt="signin-wall" />
                                <div className="d-flex align-items-center position-absolute top-0 bottom-0 start-0 end-0 px-xl-5 px-4">
                                    <img
                                        src="media/logos/logo.png"
                                        alt="Software Logo"
                                        className="logo border-end border-2 pe-3 py-1"
                                    />
                                    <h2 className="text-white img-container-text ms-3 m-0">Back to building stronger gyms.</h2>
                                </div>
                            </div>
                            <div className="col-md-6 col-12 px-lg-5 px-sm-4 px-3 py-lg-0 py-4">
                                <h2 className="text-center text-uppercase fw-bold mb-1">sign in</h2>
                                <p className="text-center text-muted mb-4">Welcome back to MyFitness Software</p>
                                <form onSubmit={handleForm}>
                                    <label className="form-label">Email address</label>
                                    <input name="email" value={data.email} onChange={handleChange} type="text" className={`form-control shadow-none ${showEmailError ? "error-border" : ""}`} />
                                    {showEmailError && (
                                        <div className="error-text mt-1">
                                            {isEmailEmpty ? "Email is required" : "Please enter a valid email address"}
                                        </div>
                                    )}
                                    <label className={`form-label ${showEmailError ? "mt-1" : "mt-3"}`}>Password</label>
                                    <div className="input-group">
                                        <input
                                            name="password"
                                            value={data.password}
                                            onChange={handleChange}
                                            type={showPassword ? "text" : "password"}
                                            className={`form-control shadow-none ${showPasswordError ? "error-border" : ""}`}
                                        />
                                        <button
                                            type="button"
                                            className={`btn eye-btn border-start-0 px-3 d-flex align-items-center ${showPasswordError ? "error-border" : "border"}`}
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            <img
                                                src={`/media/icons/${showPassword ? "hidden.png" : "eye.png"}`}
                                                alt="toggle"
                                                className="w-100 h-100"
                                            />
                                        </button>
                                    </div>
                                    {showPasswordError && (
                                        <div className="error-text mt-1">Password is required</div>
                                    )}
                                    <div className="d-flex mt-4">
                                        <button type="submit" disabled={loading} className="btn text-uppercase shadow-none form-control fw-bold ">{loading ? <><div className="spinner mx-auto"></div></> : "login"}</button>
                                    </div>
                                    <div className="d-flex justify-content-center mt-2">
                                        <Link className="text-decoration-none">Forgot Password?</Link>
                                    </div>
                                    <p className="d-flex justify-content-center mt-3 mb-md-0 mb-3">Don't have an account?<Link to="/signup" className="text-decoration-none ps-1">Signup</Link></p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

export default Signin;