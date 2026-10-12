
(() => {
const API=(window.APP_CONFIG?.API_BASE_URL||"").replace(/\/+$/,"");
const $=id=>document.getElementById(id);
let currentShow=null,lastRef="";

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);

async function api(path,options={}){
  if(!API||API.includes("REPLACE-WITH"))
    throw Error("Website setup incomplete: set API_BASE_URL in frontend/config.js.");
  const r=await fetch(API+path,{
    ...options,
    credentials:"include",
    headers:{"Content-Type":"application/json",...(options.headers||{})}
  });
  const b=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(b.error||"Request failed.");
  return b;
}

async function loadMovies(){
  const grid=$("movie-grid");
  try{
    const {movies}=await api("/movies");
    if(!movies.length){
      grid.innerHTML='<div class="empty">No movies listed yet. Check back soon.</div>';
      return;
    }
    grid.innerHTML=movies.map(m=>{
      const count=Number(m.verified_tickets||0);
      const reserved=Number(m.reserved_tickets||0);
      const capacity=Number(m.capacity||30);
      const time=m.show_status==="confirmed"&&m.show_time?esc(m.show_time):"Coming Soon";
      const poster=m.poster_url
        ?`<img src="${esc(m.poster_url)}" alt="${esc(m.title)} poster" loading="lazy" onerror="this.style.display='none'">`
        :"";
      const bookable=m.show_id&&m.show_status!=="cancelled"&&reserved<capacity;
      return `<article class="movie-card">
        <div class="movie-poster">${poster}<div class="fallback">${esc(m.title)}</div></div>
        <div class="movie-body">
          <h3>${esc(m.title)}</h3>
          <p>${esc(m.description)}</p>
          <div class="movie-meta"><span>🕒 ${time}</span><span>${money(99)} / ticket</span></div>
          <div class="progress">⭐ ${count}/5 paid tickets to confirm · ${Math.max(0,capacity-reserved)} left</div>
          ${bookable
            ?`<button class="btn primary book" data-show="${esc(m.show_id)}" data-title="${esc(m.title)}" data-time="${time}" data-remaining="${Math.max(0,capacity-reserved)}">Book tickets ↗</button>`
            :'<button class="btn secondary" disabled>Not available</button>'}
        </div>
      </article>`;
    }).join("");

    grid.querySelectorAll(".book").forEach(b=>
      b.addEventListener("click",()=>openBooking(
        b.dataset.show,b.dataset.title,b.dataset.time,Number(b.dataset.remaining)
      ))
    );
  }catch(e){
    grid.innerHTML=`<div class="empty">${esc(e.message)}<br>Check the backend URL and try again.</div>`;
  }
}

async function openBooking(showId,title,time,remaining){
  try{
    currentShow={id:showId,remaining};
    $("booking-form").reset();
    $("show-id").value=showId;
    $("booking-title").textContent=title;
    $("booking-meta").textContent=`Show timing: ${time} · ₹99 per ticket`;

    const max=Math.min(30,remaining);
    $("ticket-count").innerHTML=Array.from({length:max},(_,i)=>
      `<option value="${i+1}">${i+1} ${i===0?"ticket":"tickets"}</option>`
    ).join("");

    $("total-amount").textContent=money(99);
    $("booking-message").textContent="";
    $("booking-message").classList.remove("error");

    const c=await api("/config");
    $("upi-instructions").textContent=c.upiId
      ?`Pay ${money(99)} per ticket to UPI ID: ${c.upiId}. Check the recipient name in your UPI app before paying. Total updates with ticket quantity.`
      :"UPI details have not been configured. Contact the business before paying.";

    $("ticket-count").onchange=()=>
      $("total-amount").textContent=money(Number($("ticket-count").value)*99);

    $("booking-dialog").showModal();
  }catch(e){
    $("main-message").textContent=e.message;
    $("main-message").classList.add("error");
  }
}

$("close-modal").addEventListener("click",()=>$("booking-dialog").close());
$("close-result").addEventListener("click",()=>$("result-dialog").close());

$("booking-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=$("submit-booking");
  btn.disabled=true;
  btn.textContent="Creating booking…";

  try{
    const body={
      showId:$("show-id").value,
      name:$("customer-name").value.trim(),
      mobile:$("customer-mobile").value.trim(),
      tickets:Number($("ticket-count").value),
      upiReference:$("payment-ref").value.trim()
    };

    const r=await api("/bookings",{
      method:"POST",
      body:JSON.stringify(body)
    });

    lastRef=r.booking.booking_ref;
    $("booking-dialog").close();

    $("result-text").textContent=
      `Booking code: ${lastRef}. Status: payment pending. `+
      `Pay ${money(r.booking.amount_paise/100)} to ${r.upiId}. `+
      `The UPI reference was submitted with your request. Save this booking code.`;

    $("result-dialog").showModal();
    $("copy-code").textContent="Copy booking code";
    $("copy-code").onclick=async()=>{
      try{
        await navigator.clipboard.writeText(lastRef);
        $("copy-code").textContent="Copied!";
      }catch{
        $("result-text").textContent+=" Booking code: "+lastRef;
      }
    };
    loadMovies();
  }catch(err){
    $("booking-message").textContent=err.message;
    $("booking-message").classList.add("error");
  }finally{
    btn.disabled=false;
    btn.textContent="Create booking";
  }
});

$("year").textContent=new Date().getFullYear();
loadMovies();
})();
