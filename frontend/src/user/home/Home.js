import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import "./Home.css";
import 'swiper/css';
import 'swiper/css/effect-fade';

const LINKS = [
    { name: "features", link: "features" },
    { name: "prices", link: "prices" },
    { name: "testimonials", link: "testimonials" },
    { name: "contact", link: "footer" },
];

const FEATURES = [
    { image: "member_management.png", title: "member management", description: "Manage all your gym members seamlessly from a single dashboard. Track attendance, renewals, and member profiles effortlessly." },
    { image: "billing.png", title: "billing & payments", description: "Automate your gym's finances. Generate invoices, enable auto-pay, and allow members to renew their subscriptions online." },
    { image: "whatsapp_notification.png", title: "whatsapp reminders", description: " Keep your members engaged and informed. Automatically send automated payment alerts, class schedules, and updates directly to WhatsApp." },
    { image: "profit-and-loss.png", title: "profit & loss tracking", description: "Take control of your business revenue. Monitor daily expenses, track subscription growth, and analyze your net profits in real-time." },
    { image: "membership-plans.png", title: "flexible membership plans", description: "Offer personalized options to your clients. Create monthly, quarterly, or customized packages, with an option to pause memberships during holidays." },
    { image: "no-financial-risk.png", title: "zero financial risk", description: "Try our gym management software completely risk-free. Enjoy a full 30-day free trial with absolutely no credit card required." },
]

const STATS = [
    { number: "100+", title: "active gyms" },
    { number: "40%", title: "revenue growth" },
    { number: "10+", title: "hours saved" },
    { number: "99%", title: "uptime" },
]

const OFFERS = [
    { title: "Free Trial", description: "Explore premium features for 30 days", rate: "0", month: "1 month", points: ["Up to 50 members", "Basic WhatsApp reminders", "Email support"], button: "start free trial", color: "red" },
    { title: "Standard", description: "Perfect for growing gym businesses", rate: "100", month: "1 month", points: ["Unlimited members", "Standard WhatsApp reminders", "24/7 Phone & Email support"], button: "get started", color: "blue" },
    { title: "Premium", description: "Best value for long-term growth", rate: "500", month: "6 months", points: ["Unlimited members", "Automated WhatsApp reminders", "24/7 Phone & Email support", "Profit & Loss analytics"], button: "get started", color: "purple" },
    { title: "Deluxe", description: "Get maximum discount with this offer", rate: "800", month: "1 year", points: ["Unlimited members", "Automated WhatsApp reminders", "Priority 24/7 support", "Profit & Loss analytics", "Advanced flexible membership plans", "Save extra ₹400"], button: "get started", color: "green" },
]

const TESTIES = [
    { id: 1, desc: "A must-have tool for modern gyms. The value it adds is huge.", name: "Mohammad Hasan", gym: "Titan GYM", address: "Merta City" },
    { id: 2, desc: "Software is stable and lightweight. Works smoothly on all devices.", name: "Rohit Sharma", gym: "Eagle GYM", address: "Jaipur(Rajasthan)" },
    { id: 3, desc: "The analytics helped me add new time slots based on demand. Smart tool.", name: "Aditya Soni", gym: "Grow GYM", address: "Ajmer" },
    { id: 4, desc: "MyFitness has simplified my entire workflow. From attendance to payments, everything runs on auto-mode now.", name: "Deepak Sharma", gym: "Fitness First GYM", address: "Jaipur(Rajasthan)" },
]

const FAQS = [
    { id: 1, question: "What is MyFitness Software?", answer: "MyFitness Software is an all-in-one gym management platform designed to automate your billing, track member attendance, send WhatsApp reminders, and manage your gym's daily operations effortlessly." },
    { id: 2, question: "How much does MyFitness Software cost?", answer: "We offer flexible pricing starting from a 30-day Free Trial (no credit card required). Our paid plans start as low as ₹100 per month, depending on the features your gym business needs." },
    { id: 3, question: "Do I need a credit card to start the free trial?", answer: "No, you can sign up and use all premium features for 30 days completely free without entering any credit card or payment details." },
    { id: 4, question: "Can I pause or change my subscription plan later?", answer: "Yes, you can upgrade, downgrade, or cancel your subscription plan at any time directly from your dashboard without any hidden fees." },
]

const CONTACTS = [
    { img: "email.png", text: "hasanprince0786@gmail.com" },
    { img: "phone.png", text: "+91 7737008346" },
];

const whatsappNumber = "919929553597";
const whatsappMessage = "Hello! I want to enquire about the gym software.";
const instagramUserName = "hasan_prince_07";
const ICONS = [
    { img: "whatsapp.png", link: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` },
    { img: "instagram.png", link: `https://www.instagram.com/${instagramUserName}/` },
];

function Home() {

    const [activeIndex, setActiveIndex] = useState(0);
    const [openId, setOpenId] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(3);
    const [modal, setModal] = useState(false);

    const sliderImages = [
        "banner.jpg",
        "signup_wall.jpg",
        "signin_wall.jpg"
    ];

    const headerRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setItemsPerPage(width < 576 ? 1 : width < 992 ? 2 : 3);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!modal) return;
        const handleClickOutside = (e) => {
            if (headerRef.current && !headerRef.current.contains(e.target)) setModal(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [modal]);

    const totalSlides = Math.ceil((TESTIES?.length || 0) / itemsPerPage);

    const handlePrev = useCallback(() => {
        setActiveIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
    }, [totalSlides]);

    const handleNext = useCallback(() => {
        setActiveIndex((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
    }, [totalSlides]);

    const toggleFaq = useCallback((id) => {
        setOpenId((prevId) => (prevId === id ? null : id));
    }, []);

    const handleScrollToSection = useCallback((id) => {
        if (!id) {
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            const element = document.getElementById(`${id}-section`);
            element?.scrollIntoView({ behavior: "smooth" });
        }
        setModal(false);
    }, []);
    // 1200-xl, 992-lg, 768-md, 576-sm
    // img ke height htano he

    return (
        <main>
            <section ref={headerRef} id="header-section" className="position-sticky top-0 z-2 px-lg-3 px-sm-1 px-0 py-sm-3 py-2">
                <div className="container-fluid">
                    <div className="row align-items-center justify-content-between">
                        <div className="col-md-3 col-sm-4 col-5">
                            <img className="logo" onClick={() => handleScrollToSection()} src="media/logos/logo.png" alt="logo" />
                        </div>
                        <div className="col-6 d-lg-flex d-none justify-content-center">
                            <ul className="m-0 p-0">
                                {LINKS.map(({ name, link }) => (
                                    <li role="button" key={name} onClick={() => handleScrollToSection(link)} className="d-inline-block btn fw-bold text-uppercase rounded-3 mx-xl-3 mx-2 px-xl-4 px-2">
                                        {name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="col-3 d-lg-flex d-none align-items-center justify-content-end">
                            <Link to="/signin" className="text-uppercase text-center fw-bold text-decoration-none mb-0 me-4">sign in</Link>
                            <Link to="/signup">
                                <button className="btn fw-bold text-uppercase px-xl-4 px-2">start free trial</button>
                            </Link>
                        </div>
                        <div className="col-md-1 col-2 d-lg-none d-flex justify-content-end">
                            <img onClick={() => setModal(prev => !prev)} className="menu-icon" src="/media/icons/menu.png" alt="menu icon" />
                        </div>
                        {modal && (
                            <div className="px-4 pb-3">
                                <div className="col-12 mt-4">
                                    <ul className="m-0 p-0">
                                        {LINKS.map(({ name, link }) => (
                                            <li role="button" key={name} onClick={() => handleScrollToSection(link)} className="d-block text-uppercase rounded-3 mt-3">
                                                {name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="col-12 d-flex justify-content-center mt-3">
                                    <Link to="/signin" className="text-uppercase text-decoration-none">sign in</Link>
                                </div>
                                <div className="col-12 mt-2">
                                    <Link to="/signup">
                                        <button className="btn fw-bold form-control text-uppercase">start free trial</button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section id="hero-section" className="py-sm-5 py-4 px-xl-5 px-0">
                <div className="container">
                    <div className="row align-items-center flex-md-row flex-column-reverse">
                        <div className="col-md-6 col-12 mt-md-0 mt-4">
                            <h2 className="text-uppercase fw-bold text-sm-start text-center">manage, automate, and multiply your <span>fitness revenue</span> 🚀</h2>
                            <p className="text-sm-start text-center p18">Take full control of your gym business without the paperwork. Track daily profit-loss, automate payment reminders via WhatsApp, and manage trainers & member attendance from one powerful dashboard. Start growing your fitness business today — <b>no credit card required.</b></p>
                            <div className="row align-items-center gy-2">
                                <div className="col-lg-6 col-md-12 col-sm-6 col-12 pe-lg-1">
                                    <Link to="/signup" className="text-decoration-none">
                                        <button className="d-flex align-items-center justify-content-center btn text-uppercase shadow-none fw-bold form-control btn1">start free trial<img className="btn-img ms-2" src="media/icons/white-right-arrow.png" alt="arrow icon" /></button>
                                    </Link>
                                </div>
                                <div className="col-lg-6 col-md-12 col-sm-6 col-12 ps-lg-1">
                                    <button className="d-flex align-items-center justify-content-center btn text-uppercase shadow-none fw-bold form-control btn2">watch demo<img className="btn-img ms-2" src="media/icons/black_video.png" alt="video icon" /></button>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-12">
                            <Swiper
                                modules={[Autoplay, EffectFade]}
                                effect={'fade'}
                                spaceBetween={0}
                                slidesPerView={1}
                                loop={true}
                                autoplay={{
                                    delay: 3000,
                                    disableOnInteraction: false,
                                }}
                                speed={1000}
                            >
                                {sliderImages.map((src, index) => (
                                    <SwiperSlide key={index}>
                                        <img className="object-fit-cover img-responsive rounded-1" src={`media/images/${src}`} alt={`slider ${index + 1}`} />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </div>
                </div>
            </section>

            <section id="features-section">
                <div className="container">
                    <div className="row">
                        <h2 className="text-uppercase fw-bold text-center">why choose <span>my fitness software</span></h2>
                        <h3 className="text-center fw-normal">Streamline your gym operations, automate member communications, and grow your revenue effortlessly with our powerful, easy-to-use fitness management platform.</h3>
                    </div>
                    <div className="row mt-sm-4 mt-2">
                        {FEATURES.map((feature) => (
                            <div key={feature.title} className="col-md-4 col-sm-6 col-12 p-3 pb-0">
                                <div className="features-div border rounded-1 p-xl-4 p-3">
                                    <div className="d-flex justify-content-center">
                                        <img src={`media/icons/${feature.image}`} alt={feature.title} />
                                    </div>
                                    <h4 className="text-center text-uppercase fw-bold mt-4">{feature.title}</h4>
                                    <p className="text-center m-0">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="status-section">
                <div className="container">
                    <div className="row">
                        <div className="col-xl-1"></div>
                        <div className="col-xl-10 status-container p-sm-5 p-4">
                            <h2 className="text-center text-uppercase fw-bold">ready to transform your <span>gym business?</span></h2>
                            <h3 className="text-center fw-normal">Take the first step toward a smarter, more profitable gym. Set up your dashboard in minutes and give your members the premium experience they deserve.</h3>
                            <div className="row justify-content-evenly mt-md-5 mt-4">
                                {STATS.map((status) => (
                                    <div key={status.title} className="col-lg-3 col-sm-6 col-12 px-lg-3 px-2 gy-lg-0 gy-sm-3 gy-4">
                                        <div className="status-div rounded-1 py-4">
                                            <h4 className="text-center fw-bold">{status.number}</h4>
                                            <p className="text-uppercase text-center m-0">{status.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="row justify-content-center mt-sm-5 mt-4 gy-sm-0 gy-2">
                                <div className="col-xl-3 col-md-5 col-sm-6 col-12 pe-sm-1">
                                    <Link to="/signup" className="text-decoration-none">
                                        <button className="d-flex align-items-center justify-content-center btn text-uppercase shadow-none form-control fw-bold btn1">start free trial<img className="btn-img ms-2" src="media/icons/black-right-arrow.png" alt="arrow icon" /></button>
                                    </Link>
                                </div>
                                <div className="col-xl-3 col-md-5 col-sm-6 col-12 ps-sm-1">
                                    <button className="d-flex align-items-center justify-content-center btn text-uppercase form-control fw-bold btn2">watch demo<img className="btn-img ms-2" src="media/icons/white_video.png" alt="video icon" /></button>
                                </div>
                            </div>
                            <div>
                                <p className="text-center p18 mt-3 mb-0">No credit card required • 30-day free trial • Full feature access</p>
                            </div>
                        </div>
                        <div className="col-xl-1"></div>
                    </div>
                </div>
            </section>

            <section id="prices-section" className="py-sm-5 py-4 px-xl-5 px-0">
                <div className="container">
                    <div className="row">
                        <h2 className="text-center text-uppercase fw-bold">simple, transparent <span>pricing</span></h2>
                        <h3 className="text-center fw-normal">Choose the perfect plan for your gym. Start with our free trial and upgrade when you're ready.</h3>
                    </div>
                    <div className="row mt-4">
                        {OFFERS.map((offer) => (
                            <div key={offer.title} className="col-lg-4 col-sm-6 col-12 p-xl-4 p-3">
                                <div className="prices-div shadow rounded-2 p-4">
                                    <div className="height-div">
                                        <h4 className="fw-bold text-center">{offer.title}</h4>
                                        <p className="text-center">{offer.description}</p>
                                        <p className="text-center"><span className="fw-bold rate-text">₹{offer.rate}</span> /for {offer.month}</p>
                                        <ul className="p-0 m-0">
                                            {offer.points.map((point, index) => (
                                                <li key={index} className="d-flex align-items-xl-center align-items-start my-md-3 my-2">
                                                    <img className="me-3 mt-lg-0 mt-1" src={`media/icons/${offer.color}.png`} alt="right-tick" />
                                                    <p className="point-text text-muted m-0">{point}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <Link to="/signup">
                                        <button className={`btn form-control text-uppercase shadow-none fw-bold mt-4 ${offer.color}`}>{offer.button}</button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="testimonials-section">
                <div className="container">
                    <div className="row">
                        <div className="col-sm-12">
                            <h2 className="text-center text-uppercase fw-bold">trusted by <span>gym owners</span></h2>
                            <h3 className="text-center fw-normal">See how hundreds of gym owners are saving hours daily and growing their revenue with our platform.</h3>
                        </div>
                    </div>
                </div>
                <div className="container mid-container position-relative px-5 mt-4">
                    <img onClick={handlePrev} className="custom-arrow prev-arrow" src="media/icons/prev_button.png" alt="prev button" />
                    <div className="slider-wrapper">
                        <div
                            className="slider-track"
                            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                        >
                            {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                                <div className="slider-page" key={slideIndex}>
                                    <div className="row m-0">
                                        {TESTIES.slice(slideIndex * itemsPerPage, slideIndex * itemsPerPage + itemsPerPage).map((item) => (
                                            <div key={item.id} className="col-lg-4 col-sm-6 col-12 p-3">
                                                <div className="testi-div rounded-4 border position-relative p-md-4 p-3">
                                                    <img className="quote-img" src="media/icons/quote_mark.png" alt="quote mark" />
                                                    <p className="fw-normal desc-text p18 mt-3">{item.desc}</p>
                                                    <div className="add-div">
                                                        <p className="user-name fw-bold p18 m-0">{item.name}</p>
                                                        <p className="text-muted m-0">{item.gym}, {item.address}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <img onClick={handleNext} className="custom-arrow next-arrow" src="media/icons/next_button.png" alt="next button" />
                </div>
                <div className="container">
                    <div className="d-flex justify-content-center gap-2 mt-sm-4">
                        {Array.from({ length: totalSlides }).map((_, index) => (
                            <div
                                key={index}
                                className={`dot-div ${activeIndex === index ? "active" : ""}`}
                            ></div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="faq-section" className="py-sm-5 py-4">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            <h2 className="text-center text-uppercase fw-bold">Frequently Asked <span>Questions</span></h2>
                            <h3 className="text-center fw-normal">Quick answers to common questions about MyFitness Software and how it can help your gym grow.</h3>
                        </div>
                    </div>
                    <div className="row mt-sm-4 px-md-5 px-sm-0 px-3">
                        {FAQS.map((dt) => {
                            const isOpen = openId === dt.id;
                            return (
                                <div key={dt.id} className={`col-12 mt-4 p-3 faq-div rounded-1 ${isOpen ? 'is-open' : ''}`}>
                                    <div role="button" onClick={() => toggleFaq(dt.id)} className="d-flex justify-content-between align-items-center">
                                        <h4 className="m-0">{dt.question}</h4>
                                        <img src="media/icons/arrow.png" alt="toggle" className="faq-arrow ms-2" />
                                    </div>
                                    <div className="faq-answer-wrapper">
                                        <div className="faq-answer-content">
                                            <p className="m-0 pe-sm-5 pe-0 text-muted">{dt.answer}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section id="footer-section">
                <div className="container-fluid">
                    <div className="row p-md-5 p-4">
                        <div className="col-xl-4 col-sm-6 col-12">
                            <img role="button" onClick={() => handleScrollToSection()} className="logo" src="media/logos/logo.png" alt="logo" />
                            <p className="mt-3 mb-0">All-in-one gym management platform. Simple, modern, reliable.</p>
                        </div>
                        <div className="col-xl-2 col-sm-6 col-12 mt-sm-0 mt-4">
                            <h5 className="text-uppercase fw-bold mb-3">resources</h5>
                            <ul className="m-0 p-0">
                                {LINKS.map((dt) => (
                                    <li key={dt.name} className="d-block">
                                        <button
                                            onClick={() => handleScrollToSection(dt.link)}
                                            className={"btn text-capitalize ps-0"}
                                        >
                                            {dt.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="col-xl-3 col-sm-6 col-12 mt-xl-0 mt-4">
                            <h5 className="text-uppercase fw-bold mb-3">contact us</h5>
                            <ul className="m-0 p-0">
                                {CONTACTS.map((contact, index) => (
                                    <li key={index} className="d-block my-2">
                                        <p className="d-flex align-items-center"><img className="me-3" src={`media/icons/${contact.img}`} alt={contact.img} />{contact.text}</p>
                                    </li>
                                ))}
                            </ul>
                            <div className="d-flex mt-1">
                                {ICONS.map((icon, index) => (
                                    <a key={index} href={icon.link} target="_blank" rel="noopener noreferrer" className="icon-link me-2 p-2">
                                        <button className="icon-btn btn border-0 p-0">
                                            <img className="icon-img" src={`media/icons/${icon.img}`} alt={icon.img} />
                                        </button>
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div className="col-xl-3 col-sm-6 col-12 mt-xl-0 mt-4">
                            <h5 className="text-uppercase fw-bold mb-3">ready to start?</h5>
                            <p>No card required • 30-day free trial • Full feature access</p>
                            <Link to="/signup">
                                <button className="btn trial-btn text-uppercase fw-bold px-4">start free trial<img className="btn-img ms-2" src="media/icons/black-right-arrow.png" alt="rocket icon" /></button>
                            </Link>
                        </div>
                    </div>
                    <div className="row border-top">
                        <div className="col-sm-12">
                            <p className="text-center my-3">© 2026 My fitness software. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Home;