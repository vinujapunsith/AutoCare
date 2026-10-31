import React,{useEffect,useState} from "react";
import { api } from "../api";
import { Status,money } from "../components/Common";

export default function Dashboard({ setPage }){
  const [data,setData]=useState(null);
  const [parts,setParts]=useState([]);
  const [partsView,setPartsView]=useState("all");
  const [invoices,setInvoices]=useState([]);
  const [jobs,setJobs]=useState([]);
  const [loadError,setLoadError]=useState(false);
  const [retryCount,setRetryCount]=useState(0);

  useEffect(()=>{
    let cancelled=false;
    const retryDelays=[1000,2000,4000,6000];
    const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

    async function load(){
      setLoadError(false);
      for(let attempt=0;attempt<=retryDelays.length;attempt++){
        try{
          const [d,p,i,j]=await Promise.all([
            api("/dashboard"),
            api("/parts"),
            api("/invoices"),
            api("/service-requests")
          ]);
          if(cancelled) return;
          setData(d);
          setParts(Array.isArray(p)?p:[]);
          setInvoices(Array.isArray(i)?i:[]);
          setJobs(Array.isArray(j)?j:[]);
          return;
        }catch(e){
          console.error(`Dashboard load attempt ${attempt+1} failed:`,e);
          if(attempt<retryDelays.length){
            await wait(retryDelays[attempt]);
          }else if(!cancelled){
            setLoadError(true);
          }
        }
      }
    }

    load();
    return ()=>{cancelled=true;};
  },[retryCount]);

  if(!data){
    if(loadError){
      return <div className="empty" style={{minHeight:"300px",gap:"12px",padding:"24px"}}>
        <div style={{fontSize:"18px",fontWeight:700,color:"var(--text-primary, #243447)"}}>Dashboard could not load</div>
        <p style={{maxWidth:"440px",margin:0,lineHeight:1.6}}>AutoCare could not retrieve the dashboard data. Make sure the backend server and MongoDB are running, then try again.</p>
        <button type="button" className="ac-primary" onClick={()=>{setLoadError(false);setRetryCount(count=>count+1);}}>Try Again</button>
      </div>;
    }
    return <div className="ac-loading"><div/><div/><div/></div>;
  }

  const totalRevenue=invoices.reduce((s,x)=>s+Number(x.total||0),0);
  const lowStock=parts.filter(x=>Number(x.stock)<10);
  const visibleParts=partsView==="low" ? lowStock : parts;

  const jobCounts={
    pending:jobs.filter(x=>x.status==="Pending").length,
    progress:jobs.filter(x=>x.status==="In Progress").length,
    completed:jobs.filter(x=>x.status==="Completed").length
  };


  return <>
    <section className="ac-hero">
      <div className="ac-hero-overlay"></div>
      <div className="ac-hero-copy">
        <span>RELIABLE SERVICE. SMOOTHER JOURNEYS.</span>
        <h1>Expert Care<br/>for <em>Every Journey.</em></h1>
        <p>Service. Maintain. Perform. All in one powerful platform.</p>
        <div className="ac-hero-actions">
          <button className="ac-primary" onClick={()=>setPage("serviceRequests")}>＋ New Service Order</button>
          <button className="ac-secondary" onClick={()=>setPage("appointments")}>View Appointments <span>→</span></button>
        </div>
      </div>
      <div className="ac-hero-motto">
        <b>QUALITY<br/>SERVICE<br/>STRONGER<br/>TOMORROWS</b>
        <i></i>
      </div>
    </section>

    <section className="ac-stats">
      <Stat icon="🔧" value={jobs.filter(x=>x.status!=="Completed").length} label="Active Service Orders" trend="+12%" onClick={()=>setPage("serviceRequests")} />
      <Stat icon="▣" value={data.totals.upcoming} label="Today's Appointments" trend="+6%" onClick={()=>setPage("appointments")} />
      <Stat icon="◎" value={Math.max(data.totals.vehicles,0)} label="Registered Vehicles" trend="+18%" onClick={()=>setPage("vehicles")} />
      <Stat icon="◉" value={money(totalRevenue)} label="Total Revenue" trend="+26%" currency onClick={()=>setPage("invoices")} />
    </section>

    <section className="ac-dash-grid">
      <div className="ac-card ac-appointments">
        <CardHead title="Upcoming Appointments" action="View All →" onClick={()=>setPage("appointments")} />
        <div className="ac-appointment-list">
          {data.appointments.slice(0,5).map((a,index)=>(
            <div className="ac-appointment-row clickable-row" key={a._id} onClick={()=>setPage("appointments")}>
              <span className={`ac-time-line c${index%4}`}></span>
              <div className="ac-time"><b>{a.time}</b><small>{a.date}</small></div>
              <div className="ac-car-thumb">🚘</div>
              <div className="ac-appointment-main">
                <b>{a.vehicle?.registration || "Vehicle"}</b>
                <small>{a.vehicle?.customer?.name || "-"}</small>
              </div>
              <div className="ac-service-name">
                <b>{a.service?.name || "General Service"}</b>
                <small>{a.mechanic?.name || "Unassigned"}</small>
              </div>
              <Status value={a.status}/>
            </div>
          ))}
          {!data.appointments.length&&<div className="ac-no-data">No upcoming appointments</div>}
        </div>
      </div>

      <div className="ac-card ac-workflow">
        <CardHead title="Service Workflow" action="View All →" onClick={()=>setPage("serviceRequests")} />
        <div className="ac-workflow-tabs">
          <Flow label="Waiting" value={jobCounts.pending}/>
          <Flow label="In Service" value={jobCounts.progress} active/>
          <Flow label="Completed" value={jobCounts.completed}/>
        </div>
        <div className="ac-job-list">
          {jobs.slice(0,3).map((j,index)=>(
            <div className="ac-job clickable-row" key={j._id} onClick={()=>setPage("serviceRequests")}>
              <div className="ac-car-thumb large">🚙</div>
              <div className="ac-job-copy">
                <b>{j.code}</b>
                <small>{j.vehicle?.registration || "Vehicle"}</small>
                <span>{j.service?.name || "General Service"} • {j.mechanic?.name || "Unassigned"}</span>
                <div className="ac-job-progress"><i style={{width:`${j.status==="Completed"?100:j.status==="In Progress"?65:30}%`}}></i></div>
              </div>
              <Status value={j.status}/>
            </div>
          ))}
        </div>
      </div>

      <div className="ac-card ac-invoices">
        <CardHead title="Recent Invoices" action="View All →" onClick={()=>setPage("invoices")} />
        <div className="ac-mini-table-wrap">
        <table className="ac-mini-table">
          <thead><tr><th>Invoice</th><th>Customer</th><th>Vehicle</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.slice(0,5).map(x=><tr key={x._id} className="clickable-row" onClick={()=>setPage("invoices")}>
              <td><b>{x.code}</b></td>
              <td>{x.serviceRequest?.vehicle?.customer?.name || "-"}</td>
              <td>{x.serviceRequest?.vehicle?.registration || "-"}</td>
              <td><b>{money(x.total)}</b></td>
              <td><Status value={x.status}/></td>
            </tr>)}
          </tbody>
        </table>
        </div>
      </div>

      <div className="ac-card ac-parts">
        <CardHead title="Parts Inventory" action="View All →" onClick={()=>setPage("parts")} />
        <div className="ac-stock-tabs" role="tablist" aria-label="Parts inventory view">
          <button
            type="button"
            role="tab"
            aria-selected={partsView==="low"}
            className={partsView==="low" ? "active" : ""}
            onClick={()=>setPartsView("low")}
          >Low Stock <b>{lowStock.length}</b></button>
          <button
            type="button"
            role="tab"
            aria-selected={partsView==="all"}
            className={partsView==="all" ? "active" : ""}
            onClick={()=>setPartsView("all")}
          >All Parts <b>{parts.length}</b></button>
        </div>
        <div className="ac-mini-table-wrap" style={{maxHeight: "270px", overflow: "auto"}}>
        <table className="ac-mini-table">
          <thead><tr><th>Part</th><th>SKU</th><th>Stock</th><th>Price</th><th>Status</th></tr></thead>
          <tbody>
            {visibleParts.map(x=>{
              const isLowStock=Number(x.stock)<10;
              return <tr key={x._id} className="clickable-row" onClick={()=>setPage("parts")}>
                <td><b>{x.name}</b></td>
                <td>{x.code}</td>
                <td className={isLowStock?"stock-low":"stock-good"}>{x.stock}</td>
                <td>{money(x.price)}</td>
                <td><span className={`ac-stock-status ${isLowStock?"low":"good"}`}>{isLowStock?"Low Stock":"In Stock"}</span></td>
              </tr>;
            })}
            {!visibleParts.length && <tr><td colSpan="5" className="ac-no-data">{partsView==="low" ? "No low-stock parts" : "No parts in inventory"}</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  </>
}

function Stat({icon,value,label,trend,currency,onClick}){
  return <button className="ac-stat ac-stat-button" onClick={onClick}>
    <div className="ac-stat-icon">{icon}</div>
    <div className="ac-stat-copy"><h3 className={currency?"money":""}>{value}</h3><span>{label}</span></div>
    <div className="ac-stat-trend"><b>↑ {trend.replace("+","")}</b><small>vs. last period</small></div>
  </button>
}
function CardHead({title,action,onClick}){
  return <div className="ac-card-head"><h3>{title}</h3><button onClick={onClick}>{action}</button></div>
}
function Flow({label,value,active}){
  return <div className={`ac-flow ${active?"active":""}`}><b>{value}</b><span>{label}</span></div>
}
