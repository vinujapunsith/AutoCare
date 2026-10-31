import React,{useEffect,useState} from "react";
import { api } from "./api";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Vehicles from "./pages/Vehicles";
import Appointments from "./pages/Appointments";
import Services from "./pages/Services";
import Mechanics from "./pages/Mechanics";
import Parts from "./pages/Parts";
import ServiceRequests from "./pages/ServiceRequests";
import Invoices from "./pages/Invoices";
import History from "./pages/History";
import Profile from "./pages/Profile";

const validPages = new Set([
  "dashboard",
  "customers",
  "vehicles",
  "appointments",
  "services",
  "mechanics",
  "parts",
  "serviceRequests",
  "invoices",
  "history",
  "profile"
]);

const userPages = new Set(["appointments", "vehicles", "services", "profile"]);

function pageFromUrl(){
  const hash = window.location.hash.replace("#","");
  return validPages.has(hash) ? hash : "dashboard";
}

export default function App(){
  const [user,setUser]=useState(null);
  const [authView,setAuthView]=useState("welcome");
  const [page,setPageState]=useState(pageFromUrl);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
                                                                          
    localStorage.removeItem("token");
    const token=sessionStorage.getItem("token");
    if(!token){
      setLoading(false);
      return;
    }

    api("/auth/me")
      .then(setUser)
      .catch(()=>sessionStorage.removeItem("token"))
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    const current = pageFromUrl();
    window.history.replaceState({ page: current }, "", `#${current}`);
    setPageState(current);

    const handlePopState = (event)=>{
      const next = event.state?.page && validPages.has(event.state.page)
        ? event.state.page
        : pageFromUrl();
      setPageState(next);
                                                                         
                                                               
      setAuthView(event.state?.authView === "login" ? "login" : "welcome");
    };

    window.addEventListener("popstate",handlePopState);
    return ()=>window.removeEventListener("popstate",handlePopState);
  },[]);

  useEffect(()=>{
    if(user && user.role !== "Admin" && !userPages.has(page)){
      window.history.replaceState({ page: "appointments" }, "", "#appointments");
      setPageState("appointments");
    }
  },[user,page]);

  const navigate=(nextPage)=>{
    if(!validPages.has(nextPage)) return;
    if(user && user.role !== "Admin" && !userPages.has(nextPage)) return;
    if(nextPage===page) return;

    window.history.pushState({ page: nextPage }, "", `#${nextPage}`);
    setPageState(nextPage);
  };

  const openLogin=()=>{
    window.history.pushState({ page, authView: "login" }, "", "#login");
    setAuthView("login");
  };

  const backToWelcome=()=>{
    if(window.history.state?.authView === "login"){
      window.history.back();
      return;
    }
    setAuthView("welcome");
    window.history.replaceState({ page, authView: "welcome" }, "", `#${page}`);
  };

  const handleAuth=(authenticatedUser)=>{
    const firstPage = authenticatedUser?.role === "Admin" ? "dashboard" : "appointments";
    setUser(authenticatedUser);
    setAuthView("welcome");
    setPageState(firstPage);
                                                                          
    window.history.replaceState({ page: firstPage }, "", `#${firstPage}`);
  };

  const goBack=()=>{
    if(window.history.length>1){
      window.history.back();
    }else{
      navigate(user?.role === "Admin" ? "dashboard" : "appointments");
    }
  };

  const logout=()=>{
    sessionStorage.removeItem("token");
    setUser(null);
    setAuthView("welcome");
    window.history.replaceState({ page:"dashboard", authView:"welcome" }, "", "#dashboard");
    setPageState("dashboard");
  };

  if(loading) return <div className="empty">Loading...</div>;

  if(!user){
    if(authView === "login"){
      return <Auth onAuth={handleAuth} onBack={backToWelcome}/>;
    }
    return <Welcome onSignIn={openLogin}/>;
  }

  const pages={
    dashboard:<Dashboard setPage={navigate}/>,
    customers:<Customers/>,
    vehicles:<Vehicles user={user}/>,
    appointments:<Appointments user={user}/>,
    services:<Services user={user}/>,
    mechanics:<Mechanics/>,
    parts:<Parts/>,
    serviceRequests:<ServiceRequests/>,
    invoices:<Invoices/>,
    history:<History/>,
    profile:<Profile user={user} setUser={setUser}/>
  };

  return (
    <Layout
      page={page}
      setPage={navigate}
      goBack={goBack}
      user={user}
      logout={logout}
    >
      {pages[page] || pages[user.role === "Admin" ? "dashboard" : "appointments"]}
    </Layout>
  );
}
