import "./Common.css";

function Loader() {
    return (
        <>
            <section id="loader-section" className="d-flex align-items-center">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-12 d-flex justify-content-center">
                            <div className="spinner"></div>
                        </div>
                    </div>
                    <div className="row mt-3">
                        <div className="col-12">
                            <h2 className="text-center fw-bold m-0">myfitness software is loading...</h2>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

export default Loader;