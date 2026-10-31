import React,{useEffect,useMemo,useRef,useState} from "react";
import { api } from "../api";

const items = [
  ["dashboard","⌂","Dashboard"],
  ["appointments","▣","Appointments"],
  ["serviceRequests","▤","Service Jobs"],
  ["customers","◎","Customers"],
  ["vehicles","▱","Vehicles"],
  ["services","◇","Services"],
  ["mechanics","⚒","Mechanics"],
  ["parts","⬡","Inventory"],
  ["invoices","▧","Invoices"],
  ["history","⌁","History"]
];

const userItems = [
  ["appointments","▣","My Appointments"],
  ["vehicles","▱","My Vehicles"],
  ["services","◇","Services"]
];

const names = {
  dashboard:"Dashboard",
  appointments:"Appointments",
  serviceRequests:"Service Jobs",
  customers:"Customers",
  vehicles:"Vehicles",
  services:"Services",
  mechanics:"Mechanics",
  parts:"Inventory",
  invoices:"Invoices",
  history:"History",
  profile:"Settings"
};

function buildSearchResults(data, query) {
  if (!data || query.length < 2) return [];

  const sources = [
    {
      rows:data.customers, type:"Customer", page:"customers",
      title:x=>x.name || x.code || "Customer",
      subtitle:x=>[x.code,x.phone,x.email].filter(Boolean).join(" · "),
      searchable:x=>[x.code,x.name,x.phone,x.email,x.address]
    },
    {
      rows:data.vehicles, type:"Vehicle", page:"vehicles",
      title:x=>x.registration || "Vehicle",
      subtitle:x=>[x.brand,x.model,x.customer?.name].filter(Boolean).join(" · "),
      searchable:x=>[x.registration,x.brand,x.model,x.year,x.type,x.customer?.name,x.customer?.phone]
    },
    {
      rows:data.invoices, type:"Invoice", page:"invoices",
      title:x=>x.code || "Invoice",
      subtitle:x=>[x.serviceRequest?.vehicle?.registration,x.serviceRequest?.vehicle?.customer?.name,x.status].filter(Boolean).join(" · "),
      searchable:x=>[x.code,x.date,x.status,x.serviceRequest?.vehicle?.registration,x.serviceRequest?.vehicle?.customer?.name,x.serviceRequest?.service?.name]
    },
    {
      rows:data.serviceRequests, type:"Service Job", page:"serviceRequests",
      title:x=>x.code || "Service Job",
      subtitle:x=>[x.vehicle?.registration,x.vehicle?.customer?.name,x.status].filter(Boolean).join(" · "),
      searchable:x=>[x.code,x.date,x.status,x.vehicle?.registration,x.vehicle?.customer?.name,x.service?.name,x.mechanic?.name]
    },
    {
      rows:data.appointments, type:"Appointment", page:"appointments",
      title:x=>x.date ? `Appointment · ${x.date}` : "Appointment",
      subtitle:x=>[x.time,x.vehicle?.registration,x.service?.name,x.status].filter(Boolean).join(" · "),
      searchable:x=>[x.date,x.time,x.status,x.vehicle?.registration,x.vehicle?.customer?.name,x.service?.name,x.mechanic?.name]
    },
    {
      rows:data.services, type:"Service", page:"services",
      title:x=>x.name || "Service",
      subtitle:x=>[x.category,x.duration].filter(Boolean).join(" · "),
      searchable:x=>[x.name,x.category,x.duration,x.price]
    },
    {
      rows:data.mechanics, type:"Mechanic", page:"mechanics",
      title:x=>x.name || x.code || "Mechanic",
      subtitle:x=>[x.code,x.specialization,x.phone].filter(Boolean).join(" · "),
      searchable:x=>[x.name,x.code,x.phone,x.specialization,x.status]
    },
    {
      rows:data.parts, type:"Part", page:"parts",
      title:x=>x.name || x.code || "Part",
      subtitle:x=>[x.code,x.category,Number.isFinite(Number(x.stock))?`Stock: ${x.stock}`:""].filter(Boolean).join(" · "),
      searchable:x=>[x.name,x.code,x.category,x.supplier,x.stock,x.price]
    }
  ];

  return sources.flatMap(source => (Array.isArray(source.rows) ? source.rows : []).map(item => ({
    id:String(item._id || item.code || `${source.type}-${source.page}`),
    type:source.type,
    page:source.page,
    title:source.title(item),
    subtitle:source.subtitle(item) || source.type,
    searchText:source.searchable(item).filter(value=>value!==undefined&&value!==null).join(" ").toLowerCase()
  }))).filter(result=>result.searchText.includes(query)).slice(0,8);
}

function buildNotifications(data, role) {
  const next=[];
  const appointments=Array.isArray(data.appointments) ? data.appointments : [];
  const serviceRequests=Array.isArray(data.serviceRequests) ? data.serviceRequests : [];
  const parts=Array.isArray(data.parts) ? data.parts : [];
  const invoices=Array.isArray(data.invoices) ? data.invoices : [];
  const add=notification=>next.push(notification);
  const getId=item=>String(item?._id || item?.code || `${item?.date || "item"}-${item?.time || ""}`);
  const dateLabel=value=>value ? String(value) : "Date not set";

  if(role==="Admin"){
    appointments
      .filter(item=>String(item.status || "Pending").toLowerCase()==="pending")
      .forEach(item=>add({
        id:`appointment-${getId(item)}-pending`,
        title:"Appointment awaiting approval",
        description:`${item.vehicle?.registration || "Vehicle"} · ${item.service?.name || "Service"} · ${dateLabel(item.date)}${item.time ? ` at ${item.time}` : ""}`,
        page:"appointments",
        tone:"blue",
        sortDate:item.updatedAt || item.createdAt || item.date
      }));

    serviceRequests
      .filter(item=>String(item.status || "Pending").toLowerCase()==="pending")
      .forEach(item=>add({
        id:`service-job-${getId(item)}-pending`,
        title:"Service job needs attention",
        description:`${item.code || "Service job"} · ${item.vehicle?.registration || "Vehicle"}`,
        page:"serviceRequests",
        tone:"amber",
        sortDate:item.updatedAt || item.createdAt || item.date
      }));

    parts
      .filter(item=>Number.isFinite(Number(item.stock)) && Number(item.stock)<=5)
      .forEach(item=>add({
        id:`low-stock-${getId(item)}-${item.stock}`,
        title:"Low inventory",
        description:`${item.name || item.code || "Part"} · ${item.stock} remaining`,
        page:"parts",
        tone:"red",
        sortDate:item.updatedAt || item.createdAt
      }));

    invoices
      .filter(item=>String(item.status || "").toLowerCase()==="unpaid")
      .forEach(item=>add({
        id:`invoice-${getId(item)}-unpaid`,
        title:"Invoice awaiting payment",
        description:`${item.code || "Invoice"} · ${new Intl.NumberFormat("en-LK",{style:"currency",currency:"LKR",maximumFractionDigits:0}).format(Number(item.total)||0)}`,
        page:"invoices",
        tone:"amber",
        sortDate:item.updatedAt || item.createdAt || item.date
      }));
  } else {
    const statusMessages={
      pending:["Appointment request submitted","Your appointment is awaiting confirmation.","amber"],
      confirmed:["Appointment confirmed","Your appointment has been confirmed.","green"],
      cancelled:["Appointment cancelled","This appointment has been cancelled.","red"],
      completed:["Service completed","Your service appointment is marked as completed.","green"],
      inprogress:["Service in progress","Work on your vehicle is in progress.","blue"]
    };
    appointments.slice(0,20).forEach(item=>{
      const status=String(item.status || "Pending");
      const normalized=status.toLowerCase().replace(/[\s_-]/g,"");
      const message=statusMessages[normalized];
      if(!message) return;
      add({
        id:`appointment-${getId(item)}-${normalized}`,
        title:message[0],
        description:`${item.service?.name || "Vehicle service"} · ${dateLabel(item.date)}${item.time ? ` at ${item.time}` : ""}`,
        page:"appointments",
        tone:message[2],
        sortDate:item.updatedAt || item.createdAt || item.date
      });
    });
  }

  next.sort((a,b)=>{
    const dateA=Date.parse(a.sortDate || "") || 0;
    const dateB=Date.parse(b.sortDate || "") || 0;
    return dateB-dateA;
  });
  return next.slice(0,20);
}

export default function Layout({ page, setPage, goBack, user, logout, children }) {
  const [theme,setTheme]=useState(()=>localStorage.getItem("autocare-theme") || "light");
  const [searchTerm,setSearchTerm]=useState("");
  const [searchOpen,setSearchOpen]=useState(false);
  const [searchData,setSearchData]=useState(null);
  const [searchLoading,setSearchLoading]=useState(false);
  const searchLoadStarted=useRef(false);
  const searchInputRef=useRef(null);
  const notificationWrapRef=useRef(null);
  const loadNotificationsRef=useRef(null);
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [notifications,setNotifications]=useState([]);
  const [notificationsLoading,setNotificationsLoading]=useState(false);
  const [notificationsError,setNotificationsError]=useState("");
  const [readNotifications,setReadNotifications]=useState(()=>{
    try {
      return JSON.parse(localStorage.getItem("autocare-read-notifications") || "{}");
    } catch {
      return {};
    }
  });
  const notificationUserKey=user?.email || user?.id || user?._id || user?.role || "guest";
  const notificationDataRef=useRef({appointments:[],serviceRequests:[],parts:[],invoices:[]});
  const notificationDataUserKeyRef=useRef(`${notificationUserKey}:${user?.role || ""}`);
  const notificationInitialLoadRef=useRef(false);
  const readNotificationIds=readNotifications[notificationUserKey] || [];
  const unreadNotificationCount=notifications.filter(item=>!readNotificationIds.includes(item.id)).length;

  useEffect(()=>{
    document.documentElement.setAttribute("data-theme",theme);
    localStorage.setItem("autocare-theme",theme);
  },[theme]);

  useEffect(()=>{
    if(searchTerm.trim().length<2 || searchLoadStarted.current) return;
    searchLoadStarted.current=true;
    setSearchLoading(true);
    const requests = user?.role === "Admin"
      ? [
          api("/customers").catch(()=>[]),
          api("/vehicles").catch(()=>[]),
          api("/invoices").catch(()=>[]),
          api("/service-requests").catch(()=>[]),
          api("/appointments").catch(()=>[]),
          api("/services").catch(()=>[]),
          api("/mechanics").catch(()=>[]),
          api("/parts").catch(()=>[])
        ]
      : [
          Promise.resolve([]),
          api("/vehicles").catch(()=>[]),
          Promise.resolve([]),
          Promise.resolve([]),
          api("/appointments").catch(()=>[]),
          api("/services").catch(()=>[]),
          Promise.resolve([]),
          Promise.resolve([])
        ];
    Promise.all(requests).then(([customers,vehicles,invoices,serviceRequests,appointments,services,mechanics,parts])=>{
      setSearchData({customers,vehicles,invoices,serviceRequests,appointments,services,mechanics,parts});
    }).finally(()=>setSearchLoading(false));
  },[searchTerm,user?.role]);

  const searchResults=useMemo(
    ()=>buildSearchResults(searchData,searchTerm.trim().toLowerCase()),
    [searchData,searchTerm]
  );

  useEffect(()=>{
    localStorage.setItem("autocare-read-notifications",JSON.stringify(readNotifications));
  },[readNotifications]);

  useEffect(()=>{
    if(!user){
      setNotifications([]);
      setNotificationsError("");
      setNotificationsLoading(false);
      notificationDataRef.current={appointments:[],serviceRequests:[],parts:[],invoices:[]};
      notificationDataUserKeyRef.current="guest:";
      notificationInitialLoadRef.current=false;
      loadNotificationsRef.current=null;
      return;
    }

    const currentUserKey=`${notificationUserKey}:${user?.role || ""}`;
    if(notificationDataUserKeyRef.current!==currentUserKey){
      notificationDataUserKeyRef.current=currentUserKey;
      notificationDataRef.current={appointments:[],serviceRequests:[],parts:[],invoices:[]};
      notificationInitialLoadRef.current=false;
      setNotifications([]);
      setNotificationsError("");
    }

    let cancelled=false;
    let requestInProgress=false;

    const sources=[{key:"appointments",path:"/appointments"}];
    if(user.role==="Admin"){
      sources.push(
        {key:"serviceRequests",path:"/service-requests"},
        {key:"parts",path:"/parts"},
        {key:"invoices",path:"/invoices"}
      );
    }

    const loadNotifications=async()=>{
      if(cancelled || requestInProgress) return;
      requestInProgress=true;
      if(!notificationInitialLoadRef.current) setNotificationsLoading(true);

      const sourceData={...notificationDataRef.current};
      let completed=0;
      let failedCount=0;

      const publishPartialResults=()=>{
        if(cancelled) return;
        const next=buildNotifications(sourceData,user.role);
        setNotifications(next);
        // Show any available alerts as soon as their own endpoint responds,
        // instead of waiting for the slowest endpoint to finish.
        if(next.length>0 && !notificationInitialLoadRef.current){
          notificationInitialLoadRef.current=true;
          setNotificationsLoading(false);
        }
      };

      const requests=sources.map(async source=>{
        try {
          const result=await api(source.path);
          if(!Array.isArray(result)) throw new Error("Invalid notification response");
          if(cancelled) return;
          sourceData[source.key]=result;
          notificationDataRef.current={...notificationDataRef.current,[source.key]:result};
          publishPartialResults();
        } catch {
          failedCount+=1;
        } finally {
          completed+=1;
          if(!cancelled && completed===sources.length){
            const next=buildNotifications(sourceData,user.role);
            setNotifications(next);
            notificationInitialLoadRef.current=true;
            setNotificationsLoading(false);
            if(failedCount===sources.length){
              setNotificationsError("Notifications couldn't be loaded. Check that the server is running and try again using the refresh button.");
            } else if(failedCount>0){
              setNotificationsError("Some notification data couldn't be loaded. Check the server connection and use the refresh button to try again.");
            } else {
              setNotificationsError("");
            }
          }
        }
      });

      await Promise.all(requests);
      requestInProgress=false;
    };

    const refreshWhenVisible=()=>{
      if(document.visibilityState==="visible") loadNotifications();
    };
    const handleVisibilityChange=()=>{
      if(document.visibilityState==="visible") loadNotifications();
    };

    loadNotificationsRef.current=loadNotifications;
    loadNotifications();
    const pollId=window.setInterval(()=>{
      if(document.visibilityState==="visible") loadNotifications();
    },5000);
    window.addEventListener("focus",refreshWhenVisible);
    document.addEventListener("visibilitychange",handleVisibilityChange);

    return ()=>{
      cancelled=true;
      if(loadNotificationsRef.current===loadNotifications) loadNotificationsRef.current=null;
      window.clearInterval(pollId);
      window.removeEventListener("focus",refreshWhenVisible);
      document.removeEventListener("visibilitychange",handleVisibilityChange);
    };
  },[user?.role,user?.id,user?._id,user?.email,notificationUserKey]);

  useEffect(()=>{
    if(!notificationsOpen) return;
    const closeOnOutsideClick=event=>{
      if(notificationWrapRef.current && !notificationWrapRef.current.contains(event.target)){
        setNotificationsOpen(false);
      }
    };
    const closeOnEscape=event=>{
      if(event.key==="Escape") setNotificationsOpen(false);
    };
    document.addEventListener("mousedown",closeOnOutsideClick);
    document.addEventListener("keydown",closeOnEscape);
    return ()=>{
      document.removeEventListener("mousedown",closeOnOutsideClick);
      document.removeEventListener("keydown",closeOnEscape);
    };
  },[notificationsOpen]);

  const markNotificationRead=id=>{
    setReadNotifications(current=>({
      ...current,
      [notificationUserKey]:Array.from(new Set([...(current[notificationUserKey] || []),id]))
    }));
  };

  const markAllNotificationsRead=()=>{
    setReadNotifications(current=>({
      ...current,
      [notificationUserKey]:Array.from(new Set([...(current[notificationUserKey] || []),...notifications.map(item=>item.id)]))
    }));
  };

  const openNotification=notification=>{
    markNotificationRead(notification.id);
    setNotificationsOpen(false);
    setPage(notification.page);
  };

  const toggleTheme=()=>{
    setTheme(current=>current==="light" ? "dark" : "light");
  };

  const initials = (user?.name || "Admin")
    .split(" ")
    .filter(Boolean)
    .slice(0,2)
    .map(v => v[0]?.toUpperCase())
    .join("");

  const selectSearchResult=result=>{
    setPage(result.page);
    setSearchTerm("");
    setSearchOpen(false);
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown=event=>{
    if(event.key==="Enter" && searchResults.length){
      event.preventDefault();
      selectSearchResult(searchResults[0]);
    }
    if(event.key==="Escape"){
      setSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <div className="ac-app">
      <aside className="ac-sidebar">
        <button className="ac-logo" onClick={()=>setPage(user?.role === "Admin" ? "dashboard" : "appointments")} aria-label="AutoCare home">
          <span className="ac-logo-mark" aria-hidden="true"></span>
          <div>
            <strong>AutoCare</strong>
            <small>Vehicle Service Management</small>
          </div>
        </button>

        <nav className="ac-nav">
          {(user?.role === "Admin" ? items : userItems).map(([id, icon, label]) => (
            <button
              key={id}
              className={`ac-nav-item ${page===id ? "active" : ""}`}
              onClick={()=>setPage(id)}
            >
              <span className="ac-nav-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="ac-sidebar-bottom">
          <button
            className={`ac-nav-item ${page==="profile" ? "active" : ""}`}
            onClick={()=>setPage("profile")}
          >
            <span className="ac-nav-icon">⚙</span>
            <span>Settings</span>
          </button>

          <div className="ac-promo">
            <div className="ac-promo-photo"></div>
            <div className="ac-promo-copy">
              <b>Great Vehicles<br/>Deserve Great Care</b>
              <small>Drive Better.<br/>Live Further.</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="ac-main">
        <header className="ac-topbar">
          <div className="ac-search">
            <span className="ac-search-icon" aria-hidden="true">⌕</span>
            <input
              ref={searchInputRef}
              aria-label={user?.role === "Admin" ? "Search customers, vehicles, invoices, services and jobs" : "Search your vehicles, appointments and services"}
              aria-expanded={searchOpen && searchTerm.trim().length>0}
              placeholder={user?.role === "Admin" ? "Search customers, vehicles, invoices..." : "Search your vehicles and appointments..."}
              value={searchTerm}
              onFocus={()=>setSearchOpen(true)}
              onChange={event=>{setSearchTerm(event.target.value);setSearchOpen(true);}}
              onKeyDown={handleSearchKeyDown}
              onBlur={()=>window.setTimeout(()=>setSearchOpen(false),150)}
            />
            {searchOpen && searchTerm.trim().length>0 && (
              <div className="ac-search-results">
                {searchTerm.trim().length<2 ? (
                  <div className="ac-search-message">Enter at least 2 characters to search.</div>
                ) : searchLoading || !searchData ? (
                  <div className="ac-search-message">Searching your records...</div>
                ) : searchResults.length ? (
                  <>
                    <div className="ac-search-heading">Search results <span>{searchResults.length}</span></div>
                    {searchResults.map(result=>(
                      <button
                        type="button"
                        className="ac-search-result"
                        key={`${result.page}-${result.id}`}
                        onMouseDown={event=>event.preventDefault()}
                        onClick={()=>selectSearchResult(result)}
                      >
                        <span className="ac-search-result-mark">{result.type.slice(0,1)}</span>
                        <span className="ac-search-result-copy">
                          <b>{result.title}</b>
                          <small>{result.subtitle}</small>
                        </span>
                        <span className="ac-search-result-type">{result.type}</span>
                      </button>
                    ))}
                    <div className="ac-search-footnote">Press Enter to open the first result</div>
                  </>
                ) : (
                  <div className="ac-search-message">No matching records found.</div>
                )}
              </div>
            )}
          </div>

          <div className="ac-top-actions">
            <button
              className="ac-theme"
              title={theme==="light" ? "Switch to dark mode" : "Switch to light mode"}
              onClick={toggleTheme}
              aria-label="Toggle appearance"
            >
              {theme==="light" ? "☼" : "☾"}
            </button>
            <div className="ac-notification-wrap" ref={notificationWrapRef}>
              <button
                type="button"
                className={`ac-bell ${notificationsOpen ? "active" : ""}`}
                title="Notifications"
                aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ""}`}
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                onClick={()=>{
                  setNotificationsOpen(open=>!open);
                  if(!notificationsOpen) loadNotificationsRef.current?.();
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
                  <path d="M10 21h4" />
                </svg>
                {unreadNotificationCount>0 && <span className="ac-bell-count">{unreadNotificationCount>9 ? "9+" : unreadNotificationCount}</span>}
              </button>

              {notificationsOpen && (
                <section className="ac-notification-panel" role="dialog" aria-label="Notifications">
                  <div className="ac-notification-head">
                    <div>
                      <b>Notifications</b>
                      <small>{notificationsLoading ? "Loading notifications..." : notificationsError ? "Unable to load notifications" : unreadNotificationCount ? `${unreadNotificationCount} unread` : "You're all caught up"}</small>
                    </div>
                    <div className="ac-notification-head-actions">
                      <button type="button" onClick={markAllNotificationsRead} disabled={!unreadNotificationCount}>Mark all read</button>
                      <button type="button" className="ac-notification-refresh" title="Refresh notifications" aria-label="Refresh notifications" onClick={()=>loadNotificationsRef.current?.()}>↻</button>
                    </div>
                  </div>
                  <div className="ac-notification-list">
                    {notificationsLoading && !notifications.length ? (
                      <div className="ac-notification-empty" role="status">Loading notifications...</div>
                    ) : (
                      <>
                        {notificationsError && (
                          <div className="ac-notification-empty" role="alert">
                            <span>!</span>
                            <b>{notifications.length ? "Some notifications could not be loaded" : "Unable to load notifications"}</b>
                            <small>{notificationsError}</small>
                          </div>
                        )}
                        {notifications.length ? notifications.map(notification=>(
                          <button
                            type="button"
                            key={notification.id}
                            className={`ac-notification-item ${readNotificationIds.includes(notification.id) ? "read" : "unread"}`}
                            onClick={()=>openNotification(notification)}
                          >
                            <span className={`ac-notification-icon ${notification.tone}`}>{notification.tone==="green" ? "✓" : notification.tone==="red" ? "!" : notification.tone==="amber" ? "•" : "i"}</span>
                            <span className="ac-notification-copy">
                              <b>{notification.title}</b>
                              <small>{notification.description}</small>
                            </span>
                            {!readNotificationIds.includes(notification.id) && <span className="ac-notification-unread-dot" aria-label="Unread"/>}
                          </button>
                        )) : !notificationsError ? (
                          <div className="ac-notification-empty">
                            <span>✓</span>
                            <b>No notifications right now</b>
                            <small>New alerts will appear here when there are updates.</small>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="ac-notification-foot">{notificationsError || "Alerts refresh automatically while AutoCare is open."}</div>
                </section>
              )}
            </div>
            <div className="ac-user">
              <div className="ac-avatar">{initials}</div>
              <div>
                <b>{user?.name}</b>
                <small>{user?.role}</small>
              </div>
              <button type="button" className="ac-logout-button" onClick={logout} title="Log out" aria-label="Log out">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        <div className="ac-pagebar">
          <div className="ac-pagebar-left">
            {page !== "dashboard" && (
              <button className="ac-back-button" onClick={goBack} title="Go back" aria-label="Go back">
                ←
              </button>
            )}
            <div>
              <span>AUTOCARE / {(user?.role === "Admin" ? names[page] : ({appointments:"My Appointments",vehicles:"My Vehicles",services:"Services",profile:"Settings"})[page])?.toUpperCase()}</span>
              <b>{user?.role === "Admin" ? names[page] : ({appointments:"My Appointments",vehicles:"My Vehicles",services:"Services",profile:"Settings"})[page]}</b>
            </div>
          </div>
          <small>Reliable service. Smoother journeys.</small>
        </div>

        <main className="ac-content">{children}</main>
      </div>
    </div>
  );
}
