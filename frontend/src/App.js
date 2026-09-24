import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ToastContainer } from 'react-toastify';
import ScrollToTop from './common/ScrollToTop';
import Loader from "./common/Loader";
import AdminLayout from './common/AdminLayout';

const Notfound = lazy(() => import("./common/Notfound"));
const Home = lazy(() => import("./user/home/Home"));
const Signin = lazy(() => import("./user/account/Signin"));
const Signup = lazy(() => import("./user/account/Signup"));
const Dashboard = lazy(() => import("./admin/Dashboard"));
const Member = lazy(() => import("./admin/Member"));
const Plan = lazy(() => import("./admin/Plan"));
const Notification = lazy(() => import("./admin/Notification"));
const Billing = lazy(() => import("./admin/Billing"));


function App() {
  return (
    <Router>
      <ToastContainer position='top-center' toastClassName="my-custom-toast" />
      <ScrollToTop />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/signin' element={<Signin />} />
          <Route path='/signup' element={<Signup />} />
          <Route path='/admin' element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path='member' element={<Member />} />
            <Route path='plan' element={<Plan />} />
            <Route path='notification' element={<Notification />} />
            <Route path='billing' element={<Billing />} />
          </Route>
          <Route path='*' element={<Notfound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;