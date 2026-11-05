/* Local synthetic demonstration. No network, storage, AI, notifications or clinical advice. */
(() => {
  'use strict';
  const M = window.CareModel;
  let state = M.createInitialState();
  let view = 'pet';
  let selected = 'A01';
  let journal = [];
  let capture = null;
  let soundEnabled = false;
  let volume = 45;
  let reminderIntensity = 'playful';
  const callPlayer = window.NightjarAudio.createPlayer({onMouth: showMouth, onStatus: updateAudioStatus});
  let resetPending = false;
  let toastTimer;
  let birdTimer;
  let birdFollowupTimer;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = value => `Day ${value}`;
  const stageLabels = () => ['Result ready','Notified','Acknowledged','Referral accepted','Appointment','Care evidence','Follow-up set'];
  const statusLabel = s => ({open:'In progress',overdue:'Needs attention',closed:'Episode closed'}[s]);
  const badge = c => `<span class="badge ${M.getStatus(state,c)}">${statusLabel(M.getStatus(state,c))}</span>`;
  const button = (action,label,kind='primary',disabled=false) => `<button class="${kind}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
  const role = actor => ({patient:'Patient · simulated',coordinator:'Care coordinator · simulated',clinic:'Clinic · simulated',system:'Demo system'}[actor] || actor);
  const eventLabel = type => ({
    result_ready:'Fictional screening result made available',
    notify:'Result notification simulated',
    acknowledge:'Next step acknowledged by demo patient',
    refer:'Demo clinic accepted referral; coordinator retained ownership',
    book:'Fictional appointment selected',
    attend:'Mock consultation / follow-up test record received',
    review:'Mock clinician review recorded',
    plan:'Fictional next follow-up plan recorded (+30 demo days)',
    close:'Evidence checked; this care episode closed',
    escalate:'Human follow-up assigned in the local demo',
    ask_help:'Medication question added to the demo help queue',
    resolve_help:'Mock pharmacist conversation record received',
    remind:'One reminder simulated; acknowledgement still needed',
    reschedule:'Missed visit rebooked to a fictional future slot'
  }[type] || type);
  const caseOption = c => `${c.id} · ${c.name} — ${c.id==='A01'?'Start here':c.id==='B02'?'No response':'Missed visit'}`;
  function picker(){return `<div class="case-picker"><label for="case">${'Fictional scenario'}</label><select id="case">${state.cases.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${caseOption(c)}</option>`).join('')}</select></div>`;}
  function shell(content){return `
    <div class="sim-banner"><strong>${'SIMULATION'}</strong><span>${'Fictional people, results & actions. No real messages or appointments.'}</span></div>
    <div class="shell ${view==='pet'?'view-pet':''}">
      <header class="topbar"><div class="brand"><img src="assets/nightingale.png" alt=""><div><div class="brand-name">Raise Your Nightingale</div><div class="brand-sub">${'Care for yourself. Grow together.'}</div></div></div><div class="header-tools"><span class="local-mark">${'Local prototype'}</span></div></header>
      <div class="subbar"><nav class="tabs" aria-label="${'Demo views'}">${[['pet','My bird'],['patient','Care journey'],['team','Care team'],['notes','Demo notes']].filter(([id])=>view!=='pet'||id!=='notes').map(([id,label])=>`<button class="tab ${view===id?'active':''}" data-view="${id}" ${view===id?'aria-current="page"':''}>${label}</button>`).join('')}</nav><div class="clock"><span>${'Demo clock'} · ${day(state.day)}</span><button class="text-button" data-ui="advance">${'+1 demo day'}</button></div></div>
      <main id="main" tabindex="-1">${content}</main>
      <footer class="footer"><p>${'Designed for continuity. Every hand-off has an owner.'}<br>${'Synthetic workflow prototype · not clinical or regional validation'}</p><button class="text-button reset" data-ui="reset">${resetPending?'Confirm reset?':'Reset demo'}</button></footer>
    </div><div class="toast" role="status" aria-live="polite" aria-atomic="true"></div>${capture?captureDialog():''}`;}
  function journey(c){return `<section class="card journey" aria-labelledby="journey-title"><div class="section-heading"><h2 id="journey-title">${'Your care, connected'}</h2><p>${'One episode. A continuing plan.'}</p></div><ol class="steps">${stageLabels().map((label,i)=>`<li class="step ${i<c.stage?'done':''} ${i===c.stage?'current':''}" ${i===c.stage?'aria-current="step"':''}><span class="dot">${i<c.stage?'✓':String(i+1).padStart(2,'0')}</span><span class="step-title">${label}</span></li>`).join('')}</ol><p class="journey-note">${'An appointment is a hand-off, not proof of care. Closure needs a visit record, clinician review and a next follow-up plan.'}</p></section>`;}
  function nextPlanDay(c){const e=c.events.findLast(e=>e.type==='plan');return e?e.day+30:null;}
  function patient(){const c=M.getCase(state,selected);const missed=c.stage===4&&c.appointmentDay<state.day;
    const titles=['Your next step is being prepared.','A result is ready. Let’s take the next step.','We’re finding the right care connection.','Choose a time to follow up.',missed?'Let’s reconnect after the missed visit.':'Your follow-up is on the calendar.','Your visit is recorded. The plan comes next.','This step is complete. Care continues.'];
    const messages=['This fictional routine diabetes eye-screening result has been flagged for follow-up by a demo clinician. The coordinator will prepare a clear explanation.','Your routine eye-screening result needs a follow-up assessment. This demo does not make a diagnosis. Please confirm that you understand the next step: arranging a follow-up visit.','You confirmed the next step. The care coordinator now owns the referral and will record whether the fictional clinic accepts it.','Demo Clinic A has accepted the referral. A fictional slot is available in two demo days. Your coordinator remains responsible until care is confirmed.',missed?'There is no visit record for the planned day. Your episode stays open. Ask the demo coordinator to help reschedule.':`Demo Clinic A · ${day(c.appointmentDay)} · 10:00. The clinic must provide a visit record before this episode can close.`,'A fictional consultation and follow-up test record is available. The coordinator checks the review, next plan and any open questions before closure.',`The demo team recorded the visit, review and a follow-up on ${day(nextPlanDay(c))}. This closes one episode, not your ongoing care.`];
    let action=button('to_team','See coordinator’s next step →');
    if(c.stage===1)action=button('acknowledge','I understand the next step →');
    if(c.stage===3)action=button('book',`Choose ${day(state.day+2)} · 10:00 →`);
    if(c.stage===6)action=button('to_team','View the completion record →');
    return `<div class="intro"><div><p class="eyebrow">${'A companion for ongoing care'}</p><h1>${'The next step.<br>A little clearer.'}</h1><p>${'See how a screening result can lead to follow-up care.'}</p></div>${picker()}</div>
      <div class="patient-grid"><section class="hero-card" aria-labelledby="next-step"><div class="hero-top"><div class="avatar">${c.name.slice(0,1)}</div><div><strong>${'Hello'} ${c.name}</strong><p>${'Fictional case'} ${c.id} · ${'Diabetes follow-up'}</p></div>${badge(c)}</div><p class="eyebrow">${'One thing at a time'}</p><h2 id="next-step">${titles[c.stage]}</h2><p class="message">${messages[c.stage]}</p><div class="button-row">${action}</div><p class="quiet">${'Every action here is simulated. Nothing is sent or booked.'}</p></section>
      <aside class="side-card"><img class="bird" src="assets/nightingale.png" alt="${'Nightingale care companion bird'}"/><p class="eyebrow">Raise Your Nightingale</p><h2>${'You don’t have to keep track of every hand-off.'}</h2><p>${'See what happens next, who is responsible, and when a person needs to step in.'}</p><hr><p class="label">${'Responsible for this episode'}</p><span class="pill">${'Demo care coordinator'}</span><p class="small muted">${'This prototype is in English. Local language and cultural suitability have not been validated.'}</p></aside></div>
      ${journey(c)}<div class="lower-grid"><section class="card"><div class="task-icon" aria-hidden="true">＋</div><h3>${'A question about your medication?'}</h3><p>${c.helpRequested&&!c.helpResolved?'Your fictional question is waiting in the human-help queue. The episode cannot close until it is resolved.':c.helpResolved?'A mock pharmacist conversation record has been logged. No medication or dose recommendation was generated.':'Try a fictional “I have a medication question” request. Explore how a care team could handle this question. No message is sent, and this prototype does not recommend or change medication.'}</p>${c.stage<6?button('ask_help',c.helpRequested&&!c.helpResolved?'Waiting for human review':'Simulate asking for help','secondary',c.helpRequested&&!c.helpResolved):`<span class="badge closed">${'This episode is closed'}</span>`}</section><section class="card"><div class="task-icon" aria-hidden="true">↗</div><h3>${'Follow-up is part of the plan.'}</h3><p>${c.evidence.nextPlan?`Next follow-up: ${day(nextPlanDay(c))}. This date was manually set in the fictional plan, not inferred from a lab value or population statistic.`:'A next visit or surveillance plan must be recorded before closure. A booked visit alone never counts as completed care.'}</p><span class="badge">${'Dates & rules are fictional'}</span></section></div>`;
  }
  function teamAction(c){
    let title='',body='',actions='';
    const toPatient=button('to_patient','Open patient view →','secondary');
    switch(c.stage){
      case 0:title='Explain the result and the next step';body='A fictional clinician has marked this screening result for follow-up. Simulate a clear notification; no lab interpretation or automatic risk score is used.';actions=button('notify','Simulate result notification');break;
      case 1:title='Confirm the next step';body='The patient must acknowledge the next step. A reminder does not reset the overdue clock.';actions=toPatient+button('remind','Simulate reminder','secondary',c.events.some(e=>e.type==='remind'&&e.day===state.day));break;
      case 2:title='Record an accepted referral';body='The demo coordinator checks that Demo Clinic A accepts this follow-up. Real capacity, insurance coverage and referral eligibility are not verified.';actions=button('refer','Record mock referral acceptance');break;
      case 3:title='Help the patient choose a time';body='A fictional slot is available. The patient confirms the booking in their view.';actions=toPatient;break;
      case 4:{const missed=c.appointmentDay<state.day;title=missed?'A missed visit stays open':'Wait for evidence from the clinic';body=`Planned visit: ${day(c.appointmentDay)} · 10:00. A visit record can only be added on or after that demo day.`;actions=button('attend','Add mock visit / test record','primary',state.day<c.appointmentDay)+(missed?button('reschedule','Arrange a new demo slot','secondary'):'');break;}
      case 5:title='Check the evidence before closure';body='A mock visit/test record is present. Record the clinician review and the manually chosen next follow-up. Resolve any medication question before closing.';actions=button('review','Record mock clinical review','secondary',c.evidence.review)+button('plan','Record next follow-up (+30 days)','secondary',c.evidence.nextPlan)+button('close','Close this care episode','primary',!(c.evidence.attendance&&c.evidence.review&&c.evidence.nextPlan)||c.helpRequested&&!c.helpResolved);break;
      case 6:title='One episode closed. Follow-up continues.';body=`The mock evidence is complete. Next follow-up: ${day(nextPlanDay(c))}. This is a workflow demonstration, not evidence of health improvement.`;actions=toPatient;break;
    }
    return `<section class="team-actions"><p class="eyebrow">${'Coordinator’s next step · simulated'}</p><h3>${title}</h3><p>${body}</p><div class="button-row">${actions}</div></section>`;
  }
  function team(){const c=M.getCase(state,selected),m=M.getMetrics(state);return `
    <div class="intro"><div><p class="eyebrow">${'Care coordination workspace'}</p><h1>${'Keep the loop connected.'}</h1><p>${'Three fictional cases. Every pending hand-off stays visible.'}</p></div><span class="badge">${'Role switch is for demo only'}</span></div>
    <div class="metrics">${[[`${m.closed} / ${m.total}`,'Episodes closed · synthetic'],[m.waiting,'Open episodes'],[m.overdue,'Need attention · demo rules'],[m.needsHelp,'Human-help requests']].map(([number,label])=>`<div class="metric"><strong>${number}</strong><span>${label}</span></div>`).join('')}</div>
    <div class="team-grid"><aside class="card queue"><h2>${'Follow-up queue'}</h2>${state.cases.map(item=>`<button class="case-row ${item.id===selected?'active':''}" data-case="${item.id}" ${item.id===selected?'aria-current="true"':''}><strong>${item.name} <span class="small muted">${item.id}</span></strong>${badge(item)}<span class="case-stage">${stageLabels()[item.stage]}${item.helpRequested&&!item.helpResolved?' · '+'Help requested':''}</span></button>`).join('')}<div class="queue-foot">${'Owner for all demo cases: care coordinator.<br>No response: 2 demo days.<br>Other open steps: 3 demo days.<br>Visits: after the planned day.<br>These are invented workflow rules.'}</div></aside>
    <section class="card team-detail"><div class="section-heading"><div><p class="kicker">${'Fictional diabetes eye-screening episode'} · ${c.id}</p><h2>${c.name} · ${stageLabels()[c.stage]}</h2></div>${badge(c)}</div><p class="summary">${'Owner: demo care coordinator · Referral destination: Demo Clinic A. No live clinical, booking, Malaffi or Sehatna connection.'}</p>
    ${M.getStatus(state,c)==='overdue'?`<div class="notice">${'This hand-off needs human attention. A reminder or referral alone cannot close the episode.'}</div>`:''}${teamAction(c)}
    ${c.stage<6?`<div class="button-row">${button('escalate',c.escalated?'Human follow-up assigned':'Assign human follow-up','secondary',c.escalated)}</div>`:''}
    ${c.helpRequested?`<div class="notice"><strong>${'Medication question · human review'}</strong><p>${c.helpResolved?'A mock pharmacist conversation record is logged. No medication recommendation was generated.':'A fictional medication question is unresolved. It remains visible and blocks closure.'}</p>${c.helpResolved?'':button('resolve_help','Add mock pharmacist conversation record','secondary')}</div>`:''}
    <hr class="subtle-rule"><h3>${'Evidence required for closure'}</h3><ul class="evidence">${[['attendance','Mock consultation / follow-up test record'],['review','Mock clinician review of the record'],['nextPlan','Fictional next follow-up plan']].map(([key,label])=>`<li><span class="check ${c.evidence[key]?'yes':''}">${c.evidence[key]?'✓':'–'}</span>${label}</li>`).join('')}</ul>
    <hr class="subtle-rule"><h3>${'Handoff history'}</h3><ol class="events">${[...c.events].reverse().map(e=>`<li><time>${day(e.day)}</time><div class="event-body">${eventLabel(e.type)}<small>${role(e.actor)}</small></div></li>`).join('')}</ol>${taskFollowup(c)}</section></div>`;
  }
  function notes(){return `<div class="intro"><div><p class="eyebrow">${'Scope & sources'}</p><h1>${'A small, honest prototype.'}</h1><p>${'Challenge 05 fit: chronic-care continuity anchored to one actionable screening result.'}</p></div></div><div class="note-grid">
    <section class="card"><h2>${'What you can try'}</h2><ol><li>${'A01: notify → acknowledge → accepted referral → choose a slot.'}</li><li>${'Advance the demo clock twice, record a visit, clinician review and next plan; then close the episode.'}</li><li>${'B02 / C03: try no-response escalation and rescheduling a missed visit.'}</li><li>${'Ask a medication question; it blocks closure until a mock human response record is added.'}</li></ol><p>${'All state is held in this tab’s memory. Reload or Reset returns to the original three cases.'}</p></section>
    <section class="card"><h2>${'What is still unverified'}</h2><ul><li>${'Clinical benefit, patient outcomes and UAE suitability.'}</li><li>${'Arabic and other local-language comprehension, and cultural suitability. This review interface is in English.'}</li><li>${'Actual referrals, provider capacity, insurance, records and messaging integrations.'}</li><li>${'Formal submission fields, measured workflow evaluation and final review of applicable terms.'}</li></ul><p>${'There is no AI model, diagnostic algorithm or medication advice in this version.'}</p></section>
    <section class="card wide"><h2>${'Data & provenance'}</h2><table class="source-table"><thead><tr><th>${'Source'}</th><th>${'Use in this prototype'}</th><th>${'Limits'}</th></tr></thead><tbody>
      <tr><td>${'Three authored fixtures'}</td><td>${'All names, results, dates, rules, event records and counters.'}</td><td>${'No personal records. No measured clinical effect.'}</td></tr>
      <tr><td><a href="https://hack2skill.com/event/futurehealthchallenge/" target="_blank" rel="noreferrer">Future Health · 05</a></td><td>${'Workflow requirements and scope.'}</td><td>${'Official Q&A permits synthetic evaluation; local validation is not established.'}</td></tr>
      <tr><td><a href="https://data.gov.tw/dataset/39206" target="_blank" rel="noreferrer">${'Taiwan NHI · HbA1c testing'}</a><br><a href="https://data.gov.tw/dataset/39208" target="_blank" rel="noreferrer">${'Taiwan NHI · eye examination'}</a></td><td>${'Background references only; no data rows imported or transformed.'}</td><td>${'Annual facility-level aggregates from Taiwan, not individual due dates or UAE validation. No statistical year is used in the demo.'}</td></tr>
      <tr><td><a href="https://www.inaturalist.org/sounds/1782538" target="_blank" rel="noreferrer">chiuluan · ${'Chiayi nightjar recording'}</a></td><td>${'Excerpted, volume-adjusted, converted to WAV, with short fades. Playback uses shorter sections at the original pitch and capped volume.'}</td><td><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · ${'No endorsement implied. This license applies to the recording, separately from the code.'}</td></tr>
      <tr><td>Nightingale · MIT</td><td>${'Existing bird image; step-by-step interaction principles.'}</td><td>${'New workflow code. Original navigation products preserved.'} <a href="assets/NIGHTINGALE-LICENSE.txt">${'License'}</a></td></tr>
    </tbody></table><div class="demo-controls">${button('export','Download fictional event log','secondary')}<span class="small muted">${'Local JSON · synthetic data only'}</span></div></section>
    <section class="card wide"><h2>${'Daily companion & scheduled-task simulation'}</h2><p>${'A medication record gives your bird one worm. A meal record brings a smile. Completing all three daily activities earns happy wing flaps, with occasional dances and concerts as records accumulate. Due and missed check-ins have different optional local sounds. Medication, meal and glucose tasks repeat; routine visits and tests use longer one-off demo dates. All times and recurrence rules are pre-authored fictional plans. The clock advances in whole demo days, not real hours. An overdue item remains visible to the coordinator. This version uses sample illustrations; no camera, uploads, OCR, push delivery, real scheduler or health recommendation is connected.'}</p></section><section class="card wide"><p>${'Official submission Q&A accepts synthetic evaluation and does not require testing in a live environment. This does not establish clinical benefit or guarantee acceptance.'} <a href="https://www.youtube.com/watch?v=7r0TDPl4Tmc&amp;t=2081s" target="_blank" rel="noreferrer">${'Official Q&A · 34:41–35:08'}</a></p><h2>${'The next validation step'}</h2><p>${'Test comprehension and hand-off completion with consented participants and a care team. Compare the same workflow against an explicit baseline, including failure cases. Evaluate verified completion, time to follow-up, unresolved hand-offs and staff workload. Any clinical or regional claim needs separate evidence.'}</p><p class="muted small">${'The public challenge asks for improvement evidence. The counters above describe only these three synthetic cases; they are not an improvement percentage.'}</p></section></div>`;}
  function taskFollowup(c){const tasks=M.getTasks(state,c.id);if(!tasks.length)return '';return `<hr class="subtle-rule"><h3>${'Daily plan follow-up · separate from episode evidence'}</h3><p class="small muted">${'Demo care coordinator owns missed check-ins. These are self-reports, not verified adherence. No automatic health assessment.'}</p><ul class="evidence">${tasks.map(task=>`<li><span class="badge ${M.getTaskStatus(state,task)==='overdue'?'overdue':''}">${{done:'Recorded',due:'Due',overdue:'Needs follow-up',upcoming:'Upcoming'}[M.getTaskStatus(state,task)]}</span>${window.PetPanel.taskInfo(task.id).title} · ${day(task.dueDay)}</li>`).join('')}</ul><p class="small muted">${'Scheduled reminder executions (simulated)'}: ${tasks.reduce((n,task)=>n+task.events.filter(e=>e.type==='reminder_simulated').length,0)}. ${'One per due task per demo day. No delivery receipt or clinical action is implied.'}</p>${button('to_pet','Open companion diary →','secondary')}`;}
  function captureDialog(){return `<dialog id="capture-dialog" aria-labelledby="capture-title"><div class="capture-body"><p class="eyebrow">${'SIMULATED CAPTURE · SAMPLE IMAGE'}</p><h2 id="capture-title">${capture==='meal'?'Keep a little meal memory.':'Check the sample reading.'}</h2><img src="assets/demo-${capture}.svg" alt="${'Original sample illustration, not a real photograph'}"><p>${capture==='meal'?'This illustrated meal is fictional. Save it to the local diary and your bird will smile.':'128 mg/dL · pre-filled fictional value. This demo does not read numbers from an image or interpret them.'}</p><p class="small muted">${'No camera access, uploads, real health data or external processing.'}</p><div class="button-row">${button('save_capture','Save sample record')}${button('cancel_capture','Cancel','secondary')}</div></div></dialog>`;}
  function render(focusId){
    const openPanels=[...document.querySelectorAll('.pet-disclosure[open]')].map(panel=>panel.id);
    clearTimeout(birdTimer);clearTimeout(birdFollowupTimer);
    document.documentElement.lang='en';
    document.querySelector('.skip-link').textContent='Skip to main content';
    document.getElementById('app').innerHTML=shell(view==='pet'?window.PetPanel.render({state,day,button,journal,soundEnabled,volume,reminderIntensity,model:M,reminder:window.CareBehavior.reminderCue(state)}):view==='patient'?patient():view==='team'?team():notes());
    openPanels.forEach(id=>{const panel=document.getElementById(id);if(panel)panel.open=true;});
    updateAudioStatus(callPlayer.getState().status);
    if(capture){const dialog=document.getElementById('capture-dialog');dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();capture=null;render('#main');});}
    else if(focusId){const el=document.querySelector(focusId);if(el)el.focus({preventScroll:true});}
  }
  function announce(message){clearTimeout(toastTimer);document.querySelector('.toast').textContent=message;toastTimer=setTimeout(()=>{const el=document.querySelector('.toast');if(el)el.textContent='';},4500);}
  function setView(next){callPlayer.stop();if(view==='pet'&&['patient','team'].includes(next))selected='A01';view=next;capture=null;resetPending=false;render('#main');}
  function animateBird(mood,duration=2700,after){
    clearTimeout(birdTimer);clearTimeout(birdFollowupTimer);
    const stage=document.getElementById('pet-stage');if(!stage)return;
    stage.scrollIntoView({block:'center',behavior:'auto'});stage.className='pet-stage '+mood;
    birdTimer=setTimeout(()=>{
      if(!stage.isConnected)return;
      if(after){after();return;}
      const performance=['dancing','singing'].includes(mood);
      stage.className='pet-stage'+(performance?' sass':'');
      if(performance){announce('Told you I had talent.');birdFollowupTimer=setTimeout(()=>{if(stage.isConnected)stage.className='pet-stage';},2200);}
    },duration);
  }
  function showMouth(shape){
    const bird=document.getElementById('pet-stage');if(!bird)return;
    bird.classList.remove('calling-soft','calling-medium','calling-full');
    if(shape)bird.classList.add(['','calling-soft','calling-medium','calling-full'][shape]);
  }
  function updateAudioStatus(status){
    const output=document.getElementById('audio-status');
    if(output)output.textContent=status==='playing'?'Playing the selected Chiayi recording':status==='error'?'Audio unavailable; text reminders remain':soundEnabled?'Sound on · plays only during this demo':'Sound off';
  }
  async function chirp(kind,lateDays=0,explicit=false){
    if(!soundEnabled){callPlayer.stop();return;}
    const plan=window.NightjarAudio.makePlan(kind,lateDays,{volume,intensity:reminderIntensity,explicit});
    const played=await callPlayer.play(plan);
    if(!played&&callPlayer.getState().status==='error'){soundEnabled=false;render();announce('The selected recording could not play. Text reminders remain available.');}
  }
  function playReminder(){
    const cue=window.CareBehavior.reminderCue(state);
    if(!cue||cue.attempt<1)return;
    chirp('reminder',cue.attempt-1);
    if(cue.showSideEye&&reminderIntensity!=='gentle'){
      animateBird('sass',soundEnabled?9700:2700);
      const speech=document.querySelector('#pet-stage .pet-speech');
      if(speech)speech.textContent='Ahem. I’m still here.';
    }
  }
  function stepDay(){
    state=M.advanceDay(state);resetPending=false;render('[data-ui="advance"]');
    playReminder();
    const cue=window.CareBehavior.reminderCue(state);
    announce(cue?`${window.PetPanel.taskInfo(cue.taskId).title}: reminder ${cue.attempt} simulated. Nothing was sent.`:'A whole demo day ran. No reminders were due.');
  }
  function playCompletion(sequence,index=0){
    if(index>=sequence.length)return;
    const mood=sequence[index];
    const duration=mood==='singing'&&soundEnabled?9900:mood==='flapping'?2200:2700;
    const messages={feeding:'Medication record saved. One worm for your bird!',smiling:'Meal recorded. That brings a smile.',celebrating:'Record saved. Your bird is cheering you on.',flapping:'All three daily activities recorded. Happy wing flaps!',dancing:'A little victory dance!',singing:'A tiny concert, just for you.'};
    animateBird(mood,duration,index+1<sequence.length?()=>playCompletion(sequence,index+1):undefined);
    if(mood==='singing'&&soundEnabled)chirp('song');
    announce(messages[mood]);
  }
  function finishTask(id){
    callPlayer.stop();
    const before=state;
    state=M.completeTask(state,'A01',id);
    if(id==='meal'||id==='glucose')journal.push({day:state.day,type:id,classification:'synthetic sample illustration',value:id==='glucose'?128:null,unit:id==='glucose'?'mg/dL':null});
    capture=null;render('#main');
    playCompletion(window.CareBehavior.completionSequence(before,state,id));
  }
  function exportLog(){const payload={title:'Raise Your Nightingale',classification:'FICTIONAL DEMONSTRATION ONLY',disclosure:'All cases, results, rules, records and outcomes are synthetic. No real notifications, bookings, clinical benefit or regional validation.',demoDay:state.day,metrics:M.getMetrics(state),cases:state.cases,tasks:state.tasks,sampleDiary:journal};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='nightingale-fictional-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Fictional event log downloaded locally.');}
  document.addEventListener('click',event=>{
    const el=event.target.closest('button');if(!el||el.disabled)return;
    if(el.dataset.view){setView(el.dataset.view);return;}
    if(el.dataset.case){selected=el.dataset.case;resetPending=false;render('[data-case="'+selected+'"]');return;}
    if(el.dataset.task){if(['meal','glucose'].includes(el.dataset.task)){capture=el.dataset.task;render();}else finishTask(el.dataset.task);return;}
    if(el.dataset.ui){const ui=el.dataset.ui;
      if(ui==='advance')stepDay();
      if(ui==='reset'){if(resetPending){callPlayer.stop();state=M.createInitialState();journal=[];capture=null;selected='A01';view='pet';resetPending=false;render('#main');announce('Demo reset: bird, diary, tasks and cases.');}else{resetPending=true;render('[data-ui="reset"]');announce('Press Confirm reset to reset all local demo changes.');}}return;}
    const action=el.dataset.action;if(!action)return;if(action==='to_team'){setView('team');return;}if(action==='to_patient'){setView('patient');return;}if(action==='to_pet'){setView('pet');return;}if(action==='export'){exportLog();return;}
    if(action==='start_day'){stepDay();return;}
    if(action==='run_schedule'){const before=state.tasks.reduce((n,task)=>n+task.events.length,0);state=M.runDueTasks(state);const logged=state.tasks.reduce((n,task)=>n+task.events.length,0)-before;render('#main');if(logged)playReminder();announce(logged?`${logged} reminder executions simulated. No real messages sent.`:'No new executions. Due tasks are reminded at most once per demo day.');return;}
    if(action==='sound'){soundEnabled=!soundEnabled;if(!soundEnabled)callPlayer.stop();render('[data-action="sound"]');if(soundEnabled)chirp('due');announce(soundEnabled?'Bird calls enabled for this tab only.':'Bird calls off. Text reminders stay on.');return;}
    if(action==='cancel_capture'){capture=null;render('#main');return;}
    if(action==='save_capture'){if(capture)finishTask(capture);return;}
    try{state=M.transition(state,selected,action);resetPending=false;render('#main');announce(eventLabel(action)+' · '+'simulation only');}catch(error){announce('This step is not available. Check the required evidence and demo date.');console.error(error);}
  });
  document.addEventListener('input',event=>{if(event.target.id==='volume'){volume=Number(event.target.value);event.target.nextElementSibling.textContent=volume+'%';callPlayer.setVolume(volume);}});
  document.addEventListener('change',event=>{if(event.target.id==='intensity'){reminderIntensity=event.target.value;announce('Reminder personality updated.');}if(event.target.id==='case'){selected=event.target.value;resetPending=false;render('#case');}});
  render();
})();
