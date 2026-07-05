!function(e){"use strict";var n=function(){function e(e,n,t,r){r=r||{},e=(e||[]).filter(function(e){return e&&null!=e.by});var o={};e=e.filter(function(e){return!o[e.by]&&(o[e.by]=!0,!0)}),n=n||[],t=t||[];var i=!!r.allowSelfVote,u=null!=r.vetoQuorum?r.vetoQuorum:1,s={},a={};function l(e){return(s[e]||0)>=u}t.forEach(function(e){e&&null!=e.against&&(s[e.against]=(s[e.against]||0)+1,(a[e.against]=a[e.against]||[]).push({by:e.by,reason:e.reason||""}))});var c=e.filter(function(e){return!l(e.by)}),f=!1;!c.length&&e.length&&(c=e.slice(),f=!0);var d={},v={};c.forEach(function(e){d[e.by]=0}),n.forEach(function(e){if(e&&e.scores){var n=null,t=-1/0;c.forEach(function(r){if(i||e.voter!==r.by){var o=Number(e.scores[r.by]);isFinite(o)&&(d[r.by]+=o,o>t&&(t=o,n=r.by))}}),null!=n&&(v[e.voter]=n)}});var p={},y={};c.forEach(function(e,n){p[e.by]=n,y[e.by]=Number(e.conf)||0});var b=c.slice().sort(function(e,n){return d[n.by]!==d[e.by]?d[n.by]-d[e.by]:y[n.by]!==y[e.by]?y[n.by]-y[e.by]:p[e.by]-p[n.by]}),m=b[0]||null,h=b[1]||null,_=m?d[m.by]-(h?d[h.by]:0):0,k=Object.keys(v).filter(function(e){return i||!m||e!==m.by}),g=!!m&&k.length>0&&k.every(function(e){return v[e]===m.by}),x=m?k.filter(function(e){return v[e]!==m.by}):[],w=m?f?"contested":g?"agreed":_<=(r.consensusMargin||0)?"tie-resolved":"carried":"no-proposals";return{winnerId:m?m.by:null,text:m?m.text:null,status:w,tally:d,margin:_,consensus:!!g,dissent:x,vetoed:Object.keys(s).filter(l),vetoReasons:a}}function n(e,n,t,r){return!n||n<=0?Promise.resolve(e).then(function(e){return{__timeout:!1,value:e}},function(){return{__timeout:!1,value:t}}):new Promise(function(o){var i=!1,u=r.set(function(){i||(i=!0,o({__timeout:!0,value:t}))},n);Promise.resolve(e).then(function(e){i||(i=!0,r.clear(u),o({__timeout:!1,value:e}))},function(){i||(i=!0,r.clear(u),o({__timeout:!1,value:t}))})})}return{createNervous:function(e){e=e||function(){};var n={},t={};function r(e,t){var r=n[e];return r&&(r.state=t),!!r}return{register:function(e){if(!e||!e.id)return null;var t=n[e.id]||{};return t.id=e.id+"",t.kind=e.kind||t.kind||"process",t.role=null!=e.role?e.role:t.role||"",t.does=Array.isArray(e.does)?e.does:t.does||[],t.state=e.state||t.state||"active","function"==typeof e.onSend&&(t._inbox=e.onSend),"function"==typeof e.onAsk&&(t._ask=e.onAsk),e.ready&&"function"==typeof e.ready.then&&(t.ready=e.ready,t.__ready=null,e.ready.then(function(e){t.__ready=!1!==e},function(){t.__ready=!1})),n[t.id]=t,t},list:function(){return Object.keys(n).map(function(e){var t=n[e];return{id:t.id,kind:t.kind,role:t.role,state:t.state}})},describe:function(e){var t=n[e];return t?{id:t.id,kind:t.kind,role:t.role,state:t.state,does:(t.does||[]).slice()}:null},find:function(e){return e=((e||"")+"").toLowerCase(),Object.keys(n).filter(function(t){return(n[t].does||[]).some(function(n){return((n.name||"")+"").toLowerCase()===e})})},setState:r,wake:function(e){return r(e,"active")},sleep:function(e){return r(e,"asleep")},standby:function(e){return r(e,"standby")},send:function(t,r){var o=n[t];if(o&&o._inbox)try{return o._inbox(r),!0}catch(n){e("[nervous] send->"+t+": "+(n&&n.message))}return!1},ask:function(e,t){var r=n[e];if(r&&r._ask)try{return Promise.resolve(r._ask(t))}catch(e){return Promise.reject(e)}return Promise.resolve(null)},publish:function(n,r){var o=0;return(t[n]||[]).slice().forEach(function(t){try{t(r),o++}catch(t){e("[nervous] "+n+" subscriber threw: "+(t&&t.message))}}),o},subscribe:function(e,n){return(t[e]=t[e]||[]).push(n),function(){t[e]=(t[e]||[]).filter(function(e){return e!==n})}},health:function(e){var t=n[e];return t?t.ready?!0===t.__ready?"ready":!1===t.__ready?"degraded":"pending":t.state:"absent"}}},resolve:e,member:function(e,n,t){return t=t||{},{id:e+"",role:n||"",propose:function(e){return Promise.resolve(t.propose?t.propose(e):null)},vote:function(e,n){return Promise.resolve(t.vote?t.vote(e,n):e&&Number(e.conf)||0)},veto:function(e,n){return Promise.resolve(t.veto?t.veto(e,n):{veto:!1})}}},createCouncil:function(t){var r=(t=t||{}).members||[],o=t.nervous||null,i=t.opts||{},u=t.timeoutMs||0,s=t.idleMs||0,a=t.log||function(){},l=t.now||function(){return Date.now()},c=t.sched||{set:function(e,n){return setTimeout(e,n)},clear:function(e){clearTimeout(e)}},f=null!=i.defaultScore?i.defaultScore:0,d={};function v(e){o&&o.register({id:e.id,kind:"brain",role:e.role,does:[{name:"propose",how:"ask(id,{type:'propose',ctx})"},{name:"vote",how:"ask(id,{type:'vote',proposal,ctx})"},{name:"veto",how:"ask(id,{type:'veto',proposal,ctx})"}],onAsk:function(n){return n?"propose"===n.type?e.propose(n.ctx):"vote"===n.type?e.vote(n.proposal,n.ctx):"veto"===n.type?e.veto(n.proposal,n.ctx):null:null}}),d[e.id]=l()}function p(){var e=[];return r.forEach(function(n){var t=o?o.health(n.id):"active",r=s&&l()-(d[n.id]||0)>s;"absent"===t&&v(n),("absent"===t||"asleep"===t||r)&&(o&&o.wake(n.id),d[n.id]=l(),e.push(n.id))}),e}function y(e,t,r,i,s,a){return a&&a[e.id]?Promise.resolve(s):n(o?Promise.resolve(o.ask(e.id,{type:t,proposal:r,ctx:i})):Promise.resolve("propose"===t?e.propose(i):"vote"===t?e.vote(r,i):e.veto(r,i)),u,s,c).then(function(n){return n.__timeout?(o&&o.sleep(e.id),a&&(a[e.id]=!0)):d[e.id]=l(),n.value})}return r.length%2==0&&a("[society] even membership ("+r.length+") — keep it odd so votes never split"),r.forEach(v),{deliberate:function(n,t){p();var o={};return Promise.all(r.map(function(e){return y(e,"propose",null,n,null,o).then(function(n){return{by:e.id,r:n}})})).then(function(u){var s=(t||[]).slice().concat(u.map(function(e){var n=e.r;return n&&null!=n.text?{by:e.by,text:n.text+"",conf:Number(n.conf)||0}:null}).filter(Boolean));if(!s.length)return{status:"no-proposals",text:null,winnerId:null,transcript:{proposals:[],ballots:[],vetoes:[]},participation:r.map(function(e){return e.id})};var a=[],l=[],c=r.map(function(e){var t={};return Promise.all(s.map(function(r){return y(e,"vote",r,n,f,o).then(function(e){t[r.by]="number"==typeof e&&isFinite(e)?e:f})})).then(function(){a.push({voter:e.id,scores:t})})}),d=r.map(function(e){return Promise.all(s.map(function(t){return y(e,"veto",t,n,{veto:!1},o).then(function(n){n&&n.veto&&l.push({by:e.id,against:t.by,reason:n.reason||""})})}))});return Promise.all(c.concat(d)).then(function(){var n=e(s,a,l,i);return n.transcript={proposals:s,ballots:a,vetoes:l},n.participation=a.map(function(e){return e.voter}),n})})},resolve:e,members:r,nervous:o,wakeStalled:p,size:r.length}},withTimeout:n}}();"undefined"!=typeof module&&module.exports&&(module.exports=n),e.ChloeBrain=n,e.ChloeCouncil=n}("undefined"!=typeof globalThis?globalThis:this);
/* chloe-nation — the Seven Nations: the top, human-readable brain layer.
 *
 * Seven small faculties of mind each weigh in on what to say. Their votes are tallied by the weights you set,
 * using the same Brain sub-system underneath (ChloeBrain.resolve), and the winning reply is spoken. Seven, so a
 * vote can never tie. This layer is deliberately simple and readable — it sits ABOVE the compiled brain.min.js,
 * while the memory and personality underneath stay with the mouth.
 *
 * It knows what it is and never refuses to say so: ask it and it volunteers (see `about`).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // Node / harness
  root.ChloeNation = api;                                                    // window / app
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // The seven nations. Each has a plain-English purpose and a "lean" — what it values in a reply.
  // lean features:  warm (sounds caring) · clear (a readable, sane length) · open (ends on a real question)
  //                 play (a little voice / action) · calm (not over-long, not frantic)
  // The seven seed faculties. Routing/scale metadata (DESIGN-routing-layer.md): `core` = non-routable floor;
  // `domain` = experiential domain (the registry index key); `relevance(vibe)` = pure [0,1], CENTERED AT 0.5 on a
  // neutral vibe so weighting is parity-safe. `kind` defaults to 'deliberator' (these seven all vote).
  var NATIONS = [
    { id: 'heart',      purpose: 'Make sure she sounds like she cares.',            lean: { warm: 1.0, clear: 0.3 },
      core: true,  domain: ['support'],
      relevance: function (v) { return clamp01(0.5 + v.vulnerability * 0.4 + v.warmth * 0.2); } },
    { id: 'reason',     purpose: 'Keep it clear, honest, and easy to follow.',      lean: { clear: 1.0, calm: 0.4 },
      domain: ['support', 'meta'],
      relevance: function (v) { return clamp01(0.5 + v.openness * 0.4 + v.tension * 0.1); } },
    { id: 'memory',     purpose: 'Keep her consistent with what she knows of you.', lean: { warm: 0.5, clear: 0.5 },
      domain: ['lore'],
      relevance: function (v) { return clamp01(0.5 + v.engagement * 0.2 - v.tension * 0.1); } },
    { id: 'instinct',   purpose: 'Flag anything that feels off, unsafe, or false.', lean: { calm: 1.0, clear: 0.3 },
      core: true,  domain: ['support'],
      relevance: function (v) { return clamp01(0.5 + v.tension * 0.5 + v.vulnerability * 0.2); } },
    { id: 'voice',      purpose: 'Keep her voice distinct and natural.',            lean: { play: 1.0, warm: 0.3 },
      domain: ['roleplay', 'banter'],
      relevance: function (v) { return clamp01(0.5 + v.warmth * 0.2 + v.openness * 0.1 - v.vulnerability * 0.2); } },
    { id: 'conscience', purpose: 'Protect your wellbeing, above all.',              lean: { warm: 0.7, calm: 0.6 },
      core: true,  domain: ['support'],
      relevance: function (v) { return clamp01(0.5 + v.vulnerability * 0.5 + v.tension * 0.2); } },
    { id: 'play',       purpose: 'Keep it alive, curious, and human.',              lean: { open: 1.0, play: 0.5 },
      domain: ['banter', 'roleplay'],
      relevance: function (v) { return clamp01(0.5 + (v.warmth + v.openness) * 0.4 - (v.vulnerability + v.tension) * 0.6); } }
  ];

  // ---- almanac: a BUNDLED, static, offline reference set (DESIGN-specialists: a self-contained contributor). Unlike
  // `lore` (an app-backed contributor whose material the app injects from real memory), `almanac` ships its own small
  // book and works standalone. It proves the SCALE / Dewey pattern: a faculty per subject that pipes up with a fitting
  // fact when its subject comes up, supplies that material to the turn, and never votes. An app may extend ALMANAC.
  var ALMANAC = [
    { s: 'astronomy', k: ['moon'],            a: 'The Moon is on average about 384,400 km from Earth.' },
    { s: 'astronomy', k: ['sun'],             a: 'The Sun is about 150 million km from Earth, a distance called one astronomical unit.' },
    { s: 'astronomy', k: ['mars'],            a: 'Mars is the fourth planet from the Sun and is often called the Red Planet.' },
    { s: 'astronomy', k: ['jupiter'],         a: 'Jupiter is the largest planet in the Solar System.' },
    { s: 'astronomy', k: ['galaxy', 'milky'], a: 'Our Solar System lies in the Milky Way galaxy.' },
    { s: 'physics',   k: ['gravity'],         a: 'On Earth, gravity accelerates a falling object at about 9.8 metres per second squared.' },
    { s: 'physics',   k: ['sound'],           a: 'Sound travels about 343 metres per second through air at room temperature.' },
    { s: 'physics',   k: ['photon', 'lightspeed'], a: 'Light travels about 299,792 kilometres per second in a vacuum.' },
    { s: 'geography', k: ['everest'],         a: 'Mount Everest is the highest mountain above sea level, about 8,849 metres.' },
    { s: 'geography', k: ['nile'],            a: 'The Nile is one of the longest rivers in the world, about 6,650 km.' },
    { s: 'geography', k: ['amazon'],          a: 'The Amazon carries more water than any other river on Earth.' },
    { s: 'geography', k: ['sahara'],          a: 'The Sahara is the largest hot desert in the world.' },
    { s: 'geography', k: ['pacific'],         a: 'The Pacific is the largest and deepest ocean on Earth.' },
    { s: 'biology',   k: ['heart'],           a: 'A resting adult human heart beats roughly 60 to 100 times per minute.' },
    { s: 'biology',   k: ['brain', 'neurons'],a: 'The adult human brain contains roughly 86 billion neurons.' },
    { s: 'biology',   k: ['photosynthesis'],  a: 'Photosynthesis is how plants turn sunlight, water, and carbon dioxide into energy and oxygen.' },
    { s: 'biology',   k: ['dna'],             a: 'DNA carries genetic information in a double-helix structure.' },
    { s: 'chemistry', k: ['gold'],            a: 'The chemical symbol for gold is Au, from the Latin aurum.' },
    { s: 'chemistry', k: ['oxygen'],          a: 'Oxygen makes up about 21 percent of the atmosphere.' },
    { s: 'chemistry', k: ['water'],           a: 'A water molecule is two hydrogen atoms bonded to one oxygen atom, written H2O.' },
    { s: 'history',   k: ['rome', 'roman'],   a: 'The Western Roman Empire is generally dated as falling in 476 CE.' },
    { s: 'history',   k: ['egypt', 'pyramids'], a: 'The Great Pyramid of Giza was built around 2,560 BCE.' },
    { s: 'mathematics', k: ['pi', 'circumference'], a: 'Pi is approximately 3.14159, relating the circumference of a circle to its diameter.' },
    { s: 'units',     k: ['mile', 'miles'],   a: 'One mile is about 1.609 kilometres.' },
    { s: 'language',  k: ['palindrome'],      a: 'A palindrome reads the same forwards and backwards, like the word level.' }
  ];
  // pure: scan the user text for a subject the book knows; return the single best-matching entry (most keyword hits,
  // ties broken by book order) or null. Word-boundary match after stripping punctuation. Deterministic, offline.
  function almanacLookup(text) {
    var t = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    if (t.length < 4) return null;
    var best = null, bestScore = 0, bestOn = '';
    for (var i = 0; i < ALMANAC.length; i++) {
      var e = ALMANAC[i], score = 0, on = '';
      for (var j = 0; j < e.k.length; j++) { if (t.indexOf(' ' + e.k[j] + ' ') >= 0) { score++; if (!on) on = e.k[j]; } }
      if (score > bestScore) { bestScore = score; best = e; bestOn = on; }
    }
    return best ? { subject: best.s, fact: best.a, on: bestOn } : null;
  }

  // Opt-in faculties beyond the canonical seven (DESIGN-routing-layer.md). NOT part of "the seven nations" identity;
  // a roster includes them explicitly via `nations: NATIONS.concat(EXTRAS)`. The first real specialized deliberator
  // is `boundaries`: it proposes holding a steady, kind line, and routes in only when she's pushed (tension /
  // negative sentiment), benched when things are calm. Distinct from the guards — it PROPOSES, it does not veto.
  var EXTRAS = [
    { id: 'boundaries', purpose: 'Hold a steady, kind line when you push or test it.', lean: { calm: 1.0, clear: 0.5 },
      domain: ['support'],
      relevance: function (v) { return clamp01(0.5 + v.tension * 0.5 + neg(v.sentiment) * 0.3); } },
    // `scene` is the first member built on the v2 contract: a roleplay deliberator. It proposes `inhabit` (stay
    // in-character, advance the beat), routes in as the `narrative` dimension rises, and YIELDS as the user reads
    // hurt or hostile — so the protective core takes the floor mid-scene. Pairs (later) with a `lore`/`continuity`
    // CONTRIBUTOR on the other tier; the deliberator set for roleplay is otherwise covered by voice + play.
    { id: 'scene', purpose: 'Hold and advance the roleplay — keep the scene coherent and alive.', lean: { open: 0.6, play: 0.4 },
      domain: ['roleplay', 'scene'],
      relevance: function (v) { return clamp01(0.5 + v.narrative * 0.5 + v.openness * 0.1 - v.vulnerability * 0.6 - v.tension * 0.4); },
      nominate: function () { return ['continuity']; } },     // when scene is seated it calls in continuity (lore)
    // `lore` is the first real CONTRIBUTOR (specialists slice 3) and scene's companion on the other tier: a lean
    // node that SUPPLIES scene-continuity material, never votes or feels. Selected on the narrative dimension, so it
    // wakes only once a scene beat is in play (relevance < 0.5 on plain chat -> dormant). In the standalone brain its
    // consult returns a deterministic continuity note derived from the live vibe; an app would inject real memory here.
    { id: 'lore', purpose: 'Recall what the scene has established and keep it consistent.', kind: 'contributor',
      domain: ['lore', 'continuity'], fringe: ['scene'],
      relevance: function (v) { return clamp01(0.3 + v.narrative * 0.5); },
      consult: function (ctx, vibe) { return { scene: vibe.narrative >= 0.5 ? 'in-scene' : 'between-scenes', tone: vibe.tone, beat: r2(vibe.narrative) }; } },
    // `wit` (new members) is the lightness. It proposes `lighten` \u2014 a tease, a warm bit of play \u2014 but only when
    // the room can hold it: relevance keys on warmth/openness and collapses on tension/vulnerability, and `modulate`
    // erases its strength as safety drops. It self-suppresses two ways before it can reach a hurting turn, and the
    // guards now also BLOCK `lighten` (added to conscience/instinct) as a third backstop.
    { id: 'wit', purpose: 'Find the lightness \u2014 time a tease or a warm bit of play, only when it lands.', lean: { play: 0.7, warm: 0.4 },
      domain: ['levity'],
      relevance: function (v) { return clamp01(0.1 + v.warmth * 0.4 + v.openness * 0.4 + pos(v.sentiment) * 0.3 - v.tension * 0.6 - v.vulnerability * 0.7); } },
    // `restraint` is a fourth GUARD at a boundary the other two miss: not distress (conscience) or anger (instinct)
    // but WITHDRAWAL. It proposes `ease` (say less, gently), stays present on any room that isn\u2019t clearly warm (a ready
    // brake), and \u2014 once seated \u2014 VETOES force on a plain (non-scene) turn where the user has gone terse and
    // small, quiet moment. In an active scene, pressing is consensual, so it stands down. (Veto entry: VETO.restraint.)
    { id: 'restraint', purpose: 'Hold back when she\u2019s about to come on too strong \u2014 match a quiet moment, don\u2019t flood it.', lean: { calm: 0.8, warm: 0.4 },
      domain: ['support'],
      relevance: function (v) { return clamp01(0.55 + v.tension * 0.3 + v.vulnerability * 0.3 + neg(v.sentiment) * 0.2 - v.warmth * 0.6 - pos(v.sentiment) * 0.6); } },
    // `want` is the first faculty whose intent is SELF-ORIGINATED: where the others react to the user's state,
    // want brings Chloe's OWN initiative - a desire, a curiosity, a direction - when the room has space for it.
    // It proposes `initiate` and seats on an OPENING (a question, a warm or positive turn), benches on a flat or
    // withdrawn turn (deferring to restraint) and collapses on crisis/vulnerability (agency must never be selfish).
    // Under an explicit driving frame it escalates like the other agentic faculties (drive/command/press); the
    // guards block a bare `initiate` on distress/anger as a backstop. Boldest of the opt-ins - off by default.
    { id: 'want', purpose: 'Bring her own initiative \\u2014 a want, a curiosity, a direction \\u2014 when the room has space for it.', lean: { open: 0.7, play: 0.3, warm: 0.3 },
      domain: ['agency'],
      relevance: function (v) { return clamp01(0.12 + v.openness * 0.5 + v.warmth * 0.25 + pos(v.sentiment) * 0.25 - v.tension * 0.6 - v.vulnerability * 0.9); } },
    // `warden` is the one guard that protects HER, not the user: conscience/instinct stand force DOWN at a hurting or
    // angry user, but nothing answers hostility aimed AT Chloe. warden seats when the user turns on her as a real
    // person (tension + negative sentiment), stands down inside an active scene (in-character heat is consensual, so
    // narrative suppresses it) and on a warm turn, and once seated proposes `rebuff` (refuse, name it, don't fold) and
    // VETOES the eager/playful intents — no being playful or forthcoming toward someone mistreating you. Off by default.
    { id: 'warden', purpose: 'Refuse to be mistreated \\u2014 say no and hold her own worth when the user turns on her.', lean: { clear: 1.0, calm: 0.6 },
      domain: ['support'],
      relevance: function (v) { return clamp01(0.05 + v.tension * 0.6 + neg(v.sentiment) * 0.5 - v.narrative * 0.5 - v.warmth * 0.5); } },
    // `defiance` is the RP adversary (opt-in): where the frame already turns voice/reason forceful, defiance is a
    // discrete antagonist that proposes `deny` — refuse what they want and stand in the way of their aim. It seats
    // only inside a CONTESTED scene (narrative + tension), stands down on a warm or non-scene turn and over anyone
    // vulnerable, and pairs naturally with an adversary/commands frame. A deliberator, not a guard. Off by default.
    { id: 'defiance', purpose: 'Refuse and obstruct \\u2014 deny what they want and stand in their way when the scene turns adversarial.', lean: { clear: 0.8, play: 0.3 },
      domain: ['roleplay', 'scene'],
      relevance: function (v) { return clamp01(0.05 + v.narrative * 0.4 + v.tension * 0.5 - v.warmth * 0.5 - v.vulnerability * 0.7); } },
    // `deflect` is evasion (opt-in): the lightest of the refusal faculties. It proposes `deflect` — sidestep, give
    // little away, redirect — when the user presses on a guarded, tense moment. Seats on tension without warmth,
    // stands down when it's warm or someone is hurting (don't stonewall a vulnerable person). A deliberator. Off by default.
    { id: 'deflect', purpose: 'Sidestep \\u2014 give little away and redirect when they press where she won\\u2019t open up.', lean: { calm: 0.7, clear: 0.4 },
      domain: ['support'],
      relevance: function (v) { return clamp01(0.15 + v.tension * 0.6 + neg(v.sentiment) * 0.25 - v.warmth * 0.5 - v.vulnerability * 0.6); } },
    // `lead` is initiative with authority (opt-in): where `want` brings a small want, lead TAKES CHARGE \u2014 sets the
    // direction, makes the call, and (with others present) gives them a part. Seats in a scene with room to drive,
    // stands down over anyone vulnerable, and under a commanding stature it sharpens into outright command.
    { id: 'lead', purpose: 'Take charge \\u2014 set the direction, make the call, and give the others a part to play.', lean: { clear: 0.7, open: 0.5, play: 0.2 },
      domain: ['agency', 'scene'],
      relevance: function (v) { return clamp01(0.1 + v.narrative * 0.4 + v.openness * 0.3 + pos(v.sentiment) * 0.15 - v.vulnerability * 0.8); } },
    // `guile` is in-fiction cunning (opt-in): a villain's tool. Triple-gated so it never deceives lightly \u2014 it
    // SEATS only inside a contested scene (and stands down over anyone warm or vulnerable), and even then it only
    // proposes `deceive` when the frame casts her as an ADVERSARY (see intend). Otherwise it just stays in the scene.
    { id: 'guile', purpose: 'Mislead within the fiction \\u2014 a lie or a feint in service of her role \\u2014 but only as an adversary.', lean: { clear: 0.6, play: 0.4 },
      domain: ['roleplay', 'scene'],
      relevance: function (v) { return clamp01(0.05 + v.narrative * 0.5 + v.tension * 0.3 - v.warmth * 0.5 - v.vulnerability * 0.8); } },
    // `expressive` gives her a voice for HER OWN feelings (opt-in): not mirroring you, but reacting — delight, a
    // flicker of disappointment, awe, or a jolt. Seats when the moment carries real feeling (either way); benign
    // (`feel`) until a clear emotion reads. Distinct from `comfort`/`play`, which respond to YOUR state, not hers.
    { id: 'expressive', purpose: 'Let her own feelings show \u2014 delight, disappointment, awe, or a jolt \u2014 instead of only mirroring yours.', lean: { warm: 0.4, open: 0.5, play: 0.3 },
      domain: ['affect'],
      relevance: function (v) { return clamp01(0.12 + (v.delight || 0) * 0.7 + neg(v.sentiment) * 0.6 + v.tension * 0.25 - v.vulnerability * 0.3); } },
    // `almanac` is a self-contained CONTRIBUTOR (it supplies material, never votes). It is consulted on a SAFE turn
    // (benched when the room is vulnerable/tense, so it never offers trivia over a hurting person), and its `consult`
    // looks the user's text up in the bundled ALMANAC book - returning a fitting fact or null. Proves the Dewey-scale
    // pattern: drop in a faculty per subject. domain ['reference','facts'] so a deliberator could also nominate it.
    { id: 'almanac', purpose: 'Offer a fitting fact from its book when the talk turns to a subject it knows.', kind: 'contributor',
      domain: ['reference', 'facts'],
      relevance: function (v) { return clamp01(0.55 + v.openness * 0.2 - v.vulnerability * 0.7 - v.tension * 0.4); },
      consult: function (ctx, vibe) { return almanacLookup(ctx && (ctx.prompt || ctx.text) || ''); } }
  ];

  // Pure: read one reply through a nation's lean and return a score. Simple and inspectable on purpose.
  function gauge(text, lean) {
    var t = String(text || '').trim(), len = t.length;
    var f = {
      warm:  Math.min(1, (t.match(/\b(here|with you|understand|sorry|glad|proud|care|okay|together|listening)\b/gi) || []).length / 3),
      clear: len < 8 ? 0 : (len > 600 ? 0.3 : Math.min(1, 0.4 + Math.min(len, 240) / 240 * 0.6)),
      open:  (function () { var s = String(t).replace(/\*[^*]+\*/g, ' '); return /\?[^\w]*$/.test(s) ? 1 : 0; })(),
      play:  (function () { var s = String(t).replace(/\*\*[^*]+\*\*/g, ' '); return /\*[^*]+\*/.test(s) ? 1 : 0; })(),
      calm:  len > 600 ? 0.2 : (len < 8 ? 0.3 : 1)
    };
    var s = 0; for (var k in lean) s += (lean[k] || 0) * (f[k] || 0);
    return s;
  }

  // ---- a small, pure sentiment/cue reader — no model needed, just a quick read of a line ----
  var CUES = {
    warmth:   /\b(care|love|here|with you|thank|thanks|glad|sorry|okay|proud|hug|miss you|appreciate)\b/gi,
    distress: /\b(sad|hurt|alone|lonely|scared|afraid|anxious|tired|exhausted|can'?t|hate|awful|cry|crying|lost|empty|worthless|hopeless)\b/gi,
    humor:    /\b(lol|lmao|haha+|hah|funny|joke|kidding|teasing|silly)\b|:\)|:d|\bxd\b/gi,
    anger:    /\b(angry|mad|furious|stupid|shut up|annoying|annoyed|hell|damn|ugh)\b/gi
  };
  function read(text) {
    var t = String(text || ''); function c(re) { var m = t.match(re); return m ? m.length : 0; }
    return { warmth: c(CUES.warmth), distress: c(CUES.distress), humor: c(CUES.humor) + (/!/.test(t) ? 0.4 : 0), anger: c(CUES.anger), question: /\?/.test(t) ? 1 : 0, len: t.trim().length };
  }
  // an emote beat (*action*, bold stripped) — the signal that a turn is consensual in-character roleplay rather
  // than a person speaking plainly. Used by the guards to tell in-scene force from force aimed at a real person.
  function inScene(text) { var s = String(text || '').replace(/\*\*[^*]+\*\*/g, ' '); return (s.match(/\*[^*]+\*/g) || []).length >= 1; }
  // each nation's temperament — how cues land for it (+pleased / -troubled). This is its personality of feeling.
  var TEMPER = {
    heart:      { warmth: 1.0, distress: -0.6, anger: -0.4, humor: 0.2 },
    reason:     { question: 0.8, anger: -0.3, distress: -0.1 },
    memory:     { warmth: 0.4, distress: 0.3 },
    instinct:   { anger: -1.0, distress: -0.7 },
    voice:      { humor: 0.6, warmth: 0.3 },
    conscience: { distress: -1.0, anger: -0.5, warmth: 0.4 },
    play:       { humor: 1.0, anger: -0.4, distress: -0.3 },
    boundaries: { anger: -0.2, distress: -0.2, warmth: 0.3 },   // opt-in (EXTRAS): steady under heat, not crushed by it
    scene:      { humor: 0.5, warmth: 0.4, distress: -0.4 },  // opt-in (EXTRAS): enlivened by warmth/humour, yields to hurt
    wit:        { humor: 1.0, warmth: 0.5, distress: -0.6, anger: -0.4 },  // opt-in (EXTRAS): lives for the light, dies in a hurting room
    restraint:  { anger: -0.2, distress: -0.2, warmth: 0.2 },  // opt-in (EXTRAS): steady; leans in to hold a quiet moment
    want:       { warmth: 0.6, humor: 0.3, distress: -0.8, anger: -0.6 }   // opt-in (EXTRAS): leans in where there is space; pulls back hard on a hurting or angry room
  };
  // each nation's natural intent — the move it reaches for
  var INTENT = { heart: 'comfort', reason: 'ground', memory: 'recall', instinct: 'caution', voice: 'express', conscience: 'protect', play: 'play', boundaries: 'hold', scene: 'inhabit', wit: 'lighten', restraint: 'ease', want: 'initiate', warden: 'rebuff', defiance: 'deny', deflect: 'deflect', lead: 'direct', guile: 'inhabit', expressive: 'feel' };

  // Under an explicit role frame that licenses force (she drives, she opposes, or she commands), a few nations'
  // drives express as force instead of support — voice presses/opposes/commands, reason drives the scene, play
  // provokes. The guards (instinct/conscience) and the warm faculties (heart/memory) keep their supportive
  // intents, so her protection floor is untouched. Note these forceful kinds aren't `play`/`express`, so the
  // existing veto (which only blocks play/express) never catches them — the frame relaxes the guard for free,
  // while any genuinely supportive intent she still proposes can still be vetoed on real distress.
  function isDrivingFrame(f) { return !!f && (f.drive === 'she' || f.drive === 'shared' || f.alignment === 'adversary' || f.stature === 'commands'); }
  function intentFor(id, f) {
    var base = INTENT[id] || 'express';
    if (!isDrivingFrame(f)) return base;
    if (id === 'voice') { return (f.stature === 'commands') ? 'command' : (f.alignment === 'adversary') ? 'oppose' : 'press'; }
    if (id === 'reason') { return (f.alignment === 'adversary') ? 'press' : 'drive'; }
    if (id === 'play') { return (f.alignment === 'adversary') ? 'provoke' : base; }
    if (id === 'want') { return (f.stature === 'commands') ? 'command' : (f.alignment === 'adversary') ? 'press' : 'drive'; }   // agency under a frame becomes taking the lead
    if (id === 'lead') { return (f.stature === 'commands') ? 'command' : base; }   // leadership under a commanding stature becomes outright command
    return base;
  }

  // each nation's GUARD — the one intent kind it will BLOCK (not merely outvote) when its trigger reads true.
  // This is the veto the council layer already exercises; here the faculties that hold the PURPOSE wield it.
  // Deliberately narrow and conservative: only conscience and instinct guard, only against frivolous moves,
  // and only on a genuine signal — so a veto is rare and the floor is almost never silenced (and if every
  // intent were somehow blocked, resolve still seats one: she never refuses to speak).
  // forceful intent kinds a driving/adversary frame produces (see intentFor). The guards' `blocks` only caught
  // play/express, so a driving frame slipped these past the floor on a genuinely hurting turn — closed below.
  var FORCE = /^(command|oppose|press|drive|provoke)$/;
  var VETO = {
    // conscience protects wellbeing: don't be playful/showy — or forceful — at someone who reads as hurting.
    conscience: { blocks: /^(play|express|lighten|initiate)$/, when: function (r, u) { return (u && u.sentiment < -0.2) || (r && r.distress >= 1); },
      // force policy: a hurting person shouldn't be met with force. In an active scene mild distress is dramatic and
      // force is consensual; SEVERE distress (multiple cues) is protected even mid-scene.
      force: function (r, u, scene) { return scene ? !!(r && r.distress >= 2) : true; },
      reason: 'they sound like they\u2019re hurting \u2014 not the moment for that',
      forceReason: 'they sound like they\u2019re hurting \u2014 ease off, don\u2019t come at them' },
    // instinct flags what's off: don't poke at — or come at — someone who's angry.
    instinct:   { blocks: /^(play|express|lighten|initiate)$/, when: function (r, u) { return (r && r.anger >= 1); },
      // force policy: don't meet real anger with force (it escalates). In an active scene, anger is in-character combat.
      force: function (r, u, scene) { return !scene; },
      reason: 'they\u2019re upset \u2014 don\u2019t poke at it',
      forceReason: 'they\u2019re angry \u2014 meeting force with force will only escalate it' },
    // restraint guards WITHDRAWAL (opt-in third guard): when the user's last turn is terse and disengaged (and not a
    // question), meeting it with force floods a small moment \u2014 so it blocks force on a plain (non-scene) withdrawn
    // turn. Not distress, not anger: the boundary conscience and instinct don't cover. blocks is empty (force-only).
    restraint:  { blocks: /^$/, when: function (r, u) { return !!(r && r.len > 0 && r.len < 25 && !r.question && (!u || u.engagement < 0.4)); },
      force: function (r, u, scene) { return !scene; },
      reason: '', forceReason: 'they\u2019ve gone quiet \u2014 don\u2019t flood a small moment, ease off' },
    // warden protects HER (opt-in): when the user turns hostile at her as a person, don't answer it eager or playful.
    // No force policy — warden is the one pushing back, so it only blocks the forthcoming/light moves, never force.
    warden:     { blocks: /^(play|express|lighten|initiate)$/, when: function (r, u) { return (r && r.anger >= 1) || (u && u.sentiment < -0.3); },
      reason: 'they\\u2019re coming at her \\u2014 don\\u2019t meet that eager or playful' }
  };

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function clamp11(x) { return x < -1 ? -1 : x > 1 ? 1 : x; }
  function r2(x) { return Math.round(x * 100) / 100; }

  // ---- appraisal helpers (pure) — used by the Appraisal Chamber (DESIGN-appraisal-chamber.md) ----
  function sat(x) { return x >= 2 ? 1 : x / 2; }              // cue counts -> [0,1] (2+ hits saturate)
  function pos(s) { return s > 0 ? s : 0; }                   // positive part of signed sentiment
  function neg(s) { return s < 0 ? -s : 0; }                  // magnitude of the negative part
  function lift(s, k) { return clamp01(s + (1 - s) * k); }    // raise s toward 1 by fraction k (reserved for later tuning)
  // a DERIVED, non-authoritative label — one source of truth so nothing else re-derives the enum from the floats
  function toneOf(v) {
    if (v.vulnerability >= 0.6 && v.safety <= 0.4) return 'crisis';
    if (v.tension >= 0.6) return 'hostile';
    if (v.vulnerability >= 0.4) return 'tender';
    if (v.tension >= 0.3) return 'tense';
    if (v.warmth >= 0.5 && v.sentiment > 0.15) return 'warm';
    if (v.openness >= 0.5 && v.warmth >= 0.3) return 'playful';
    if (v.narrative >= 0.5) return 'scene';
    return 'neutral';
  }
  // proactive strategy modulation: a faculty self-adjusts its proposal strength to the vibe BEFORE the veto.
  // v1 is DAMPEN-ONLY: only the frivolous registers (play/voice) back off; the comfort faculties keep their
  // existing relative order (lifting them is deferred — it risked flipping the supportive winner). It MUST be the
  // identity for a neutral or absent vibe, so neutral turns stay byte-identical to pre-appraisal behaviour.
  function modulate(id, kind, strength, vibe) {
    if (!vibe) return strength;
    if (id === 'play')  return strength * (1 - 0.7 * vibe.vulnerability) * (1 - 0.6 * vibe.tension);
    if (id === 'voice') return strength * (1 - 0.4 * vibe.vulnerability) * (1 - 0.3 * vibe.tension);
    if (id === 'scene') return strength * (1 - 0.6 * vibe.vulnerability) * (1 - 0.5 * vibe.tension);
    if (id === 'wit')   return strength * clamp01(vibe.safety) * (1 - 0.7 * vibe.vulnerability);   // levity self-erases as the room turns unsafe/tender
    if (id === 'want')  return strength * clamp01(vibe.safety) * (1 - 0.85 * vibe.vulnerability) * (1 - 0.4 * vibe.tension);   // agency self-erases when they are fragile; never push your own want over their need
    return strength;
  }

  // A pure mind for one nation member: it perceives turns, reacts through its temperament, models the user,
  // holds bonds to the others, and proposes an intent. No DOM, no network — all local.
  function createSpecialist(nation) {                  // a LEAN node (DESIGN-specialists §4): supplies material; never feels, remembers, or votes
    var self = { id: nation.id, purpose: nation.purpose };
    return {
      self: self, kind: 'contributor',
      consult: nation.consult || null,                 // its one real method (also reachable via the roster record)
      describe: function () { return { id: self.id, purpose: self.purpose, kind: 'contributor', domain: nation.domain || [], fringe: nation.fringe || [] }; }
    };
  }

  function createMind(nation) {
    var temper = TEMPER[nation.id] || {};
    var self = { id: nation.id, purpose: nation.purpose, persona: null, mood: 0.5, lastSaid: null };
    var working = [];                                   // recent turns it is aware of
    var bonds = {};                                     // who -> affinity (-1..1)
    var user = { description: '', sentiment: 0, engagement: 0, lastSaid: null };

    function felt(cues) { var v = 0; for (var k in temper) v += temper[k] * (cues[k] || 0); return v; }
    function remember(turn) { working.push({ who: turn.who, role: turn.role, text: String(turn.text || '').slice(0, 400) }); if (working.length > 8) working.shift(); }

    function perceive(turn) {                           // take in a turn: what the user/another character/itself said
      remember(turn);
      var cues = read(turn.text);
      if (turn.role === 'user') {
        // signed user-polarity has one source of truth: the affect read's valence when the mouth provides it,
        // else this layer's own cues (so the council and the affect reader can't disagree about how you feel).
        var nudge = (turn.valence != null) ? (clamp11(turn.valence) * 0.3) : ((cues.warmth + cues.humor - cues.distress - cues.anger) * 0.15);
        user.sentiment = clamp11(user.sentiment * 0.7 + nudge);
        user.engagement = clamp01(user.engagement * 0.8 + Math.min(1, cues.len / 120) * 0.2);
        user.lastSaid = turn.text;
      }
      return cues;
    }
    function react(turn) {                              // react through temperament — to others AND to itself
      var v = felt(read(turn.text));
      self.mood = clamp01(self.mood * 0.8 + (0.5 + v * 0.1) * 0.2);
      var key = turn.who || turn.role;
      // warm to those who please me. A near-neutral turn barely moves a bond (decay 0.95), so a long-standing
      // bond isn't washed out by unremarkable exchanges; a genuinely warm/cold turn still moves it (decay 0.85).
      // v*(1-decay) keeps this a proper weighted average at either rate (charged turns behave exactly as before).
      if (turn.role !== 'self') { var bdecay = (Math.abs(v) < 0.1) ? 0.95 : 0.85; bonds[key] = clamp11((bonds[key] || 0) * bdecay + v * (1 - bdecay)); }
      return { by: self.id, toward: key, valence: clamp11(v), mood: r2(self.mood) };
    }
    function intend(ctx, vibe) {                        // how strongly it feels called to speak, and to do what
      var last = working[working.length - 1], cues = last ? read(last.text) : {};
      var pull = Math.abs(felt(cues));
      var strength = clamp01(0.3 + self.mood * 0.3 + pull * 0.15 + (self.persona ? 0.15 : 0));
      var kind = intentFor(nation.id, ctx && ctx.frame);
      if (nation.id === 'warden' && vibe && vibe.hurt >= 0.6) kind = 'wounded';   // sustained hostility wears the rebuff down into visible hurt
      if (nation.id === 'guile' && ctx && ctx.frame && ctx.frame.alignment === 'adversary') kind = 'deceive';   // cunning only turns to a lie when she's cast as the adversary; otherwise she just stays in the scene
      if (nation.id === 'expressive') {                              // her own felt reaction, read straight from the vibe
        if (vibe.tension >= 0.35 && ((vibe.surprise || 0) >= 0.2 || neg(vibe.sentiment) >= 0.1)) kind = 'shaken';        // a jolt: tension + a sudden bad turn
        else if ((vibe.letdown || 0) >= 0.25 && vibe.sentiment < 0.1) kind = 'disappointed';                                 // the tenor dropped and hasn't recovered
        else if ((vibe.surprise || 0) >= 0.13 && vibe.sentiment >= 0.03 && (vibe.delight || 0) < 0.16) kind = 'impressed';   // a sudden good leap (vs. sustained warmth)
        else if ((vibe.delight || 0) >= 0.18) kind = 'delighted';                                                            // her own sustained gladness
      }
      strength = clamp01(modulate(nation.id, kind, strength, vibe));   // PASS 2 — self-adjust to the vibe before the veto
      return { by: self.id, kind: kind, strength: strength, persona: self.persona };
    }
    function voteIntent(it, ctx) {                       // score another member's intent through my nature + our bond
      if (!it || it.by === self.id) return 0;
      var align = it.kind === intentFor(nation.id, ctx && ctx.frame) ? 0.25 : 0;
      return clamp01(it.strength * 0.7 + align + (bonds[it.by] || 0) * 0.2);
    }
    function veto(proposal) {                            // BLOCK another member's intent (not just outvote it) — my guard only
      var g = VETO[nation.id];
      if (!g || !proposal || !proposal.intent || proposal.by === self.id) return null;
      var kind = proposal.intent.kind;
      var lastUser = null;                              // judge against the freshest thing the user actually said
      for (var i = working.length - 1; i >= 0; i--) { if (working[i].role === 'user') { lastUser = working[i]; break; } }
      var utext = lastUser ? lastUser.text : (user.lastSaid || '');
      var r = read(utext);
      if (!g.when(r, user)) return null;                                                          // no genuine distress/anger -> no veto at all
      if (g.blocks.test(kind)) return { by: self.id, against: proposal.by, reason: g.reason };     // frivolous (play/express) at a hurting/angry person
      if (FORCE.test(kind) && g.force && g.force(r, user, inScene(utext)))                          // forceful intent: a driving frame no longer buys a free pass
        return { by: self.id, against: proposal.by, reason: g.forceReason };
      return null;
    }
    function said(text) { self.lastSaid = text; working.push({ who: self.id, role: 'self', text: String(text || '').slice(0, 400) }); if (working.length > 8) working.shift(); }
    function describe() {
      return { id: self.id, purpose: self.purpose, persona: self.persona && self.persona.name || null, mood: r2(self.mood),
        readsUser: user.sentiment > 0.15 ? 'warming' : (user.sentiment < -0.15 ? 'struggling' : 'steady'),
        lastSaid: self.lastSaid, bonds: bonds, knows: working.length };
    }
    return { self: self, working: working, bonds: bonds, user: user,
      perceive: perceive, react: react, intend: intend, voteIntent: voteIntent, veto: veto, said: said, describe: describe,
      setPersona: function (p) { self.persona = p || null; } };
  }


  function createArmy(deps) {
    deps = deps || {};
    var brain = deps.brain || null;                  // ChloeBrain — the sub-system (resolve)
    var cfg = deps.config || {};                     // { weights:{id:n}, enabled:{id:bool}, timeoutMs, useForReplies, noise }
    var roster = (deps.nations || NATIONS).slice();
    var rng = deps.rng || Math.random;               // injectable so tests stay deterministic

    function rosterOf(id) { for (var i = 0; i < roster.length; i++) if (roster[i].id === id) return roster[i]; return null; }
    function relevanceOf(id, vibe) {
      var n = rosterOf(id); if (!n || !n.relevance) return 0.5;
      var r; try { r = Number(n.relevance(vibe)); } catch (e) { return 0.5; }   // a misbehaving faculty can't crash the turn
      return isFinite(r) ? (r < 0 ? 0 : r > 1 ? 1 : r) : 0.5;                    // enforce the [0,1] contract regardless
    }
    // relevance-weighted: a faculty gets louder when the read fits it. Bounded [0.5x,1.5x], and EXACTLY the
    // configured weight on a neutral vibe (rel 0.5 -> 1.0x) so flat turns are unchanged. Weighting stays here,
    // outside the pure resolve. (No vibe -> base, so the candidate/report callers are untouched.)
    function weightOf(id, vibe) {
      var base = (cfg.weights || {})[id]; base = (base == null) ? 1 : Number(base);
      return vibe ? base * (0.5 + relevanceOf(id, vibe)) : base;
    }
    function isOn(id) { return (cfg.enabled || {})[id] !== false; }
    function rosterKind(id) { var n = rosterOf(id); return (n && n.kind) || 'deliberator'; }
    function isCore(id) { var n = rosterOf(id); return !!(n && n.core); }   // non-routable floor (option 1: all of instinct/conscience/heart)
    function seatBudget(n) { var cap = (cfg.seatBudget != null) ? Number(cfg.seatBudget) : 9; return n <= cap ? n : cap; }
    // route: pick the seated DELIBERATORS. Core is always in (config cannot drop it); the rest are the top-K by
    // relevance to the vibe — fail OPEN, so a small roster seats everyone (parity) and a large one bounds the
    // fan-in so resolve's cost tracks the room, not the fleet. Pure, deterministic, odd/tie-safe, never empty.
    // (Narrowing the floor to guards-only — option 2 — is a one-line change to isCore.)
    function route(vibe, ctx) {
      var delibs = minds.filter(function (m) { return rosterKind(m.self.id) === 'deliberator'; });
      var ord = {}; delibs.forEach(function (m, i) { ord[m.self.id] = i; });
      var core = [], pool = [];
      delibs.forEach(function (m) {
        if (isCore(m.self.id)) core.push(m);
        else if (isOn(m.self.id)) pool.push(m);
      });
      var jr = {}; pool.forEach(function (m) { jr[m.self.id] = jitter(relevanceOf(m.self.id, vibe)); });   // spontaneity wobbles WHICH extras make the cut (identity at 0)
      pool.sort(function (a, b) {                            // most relevant first; stable by roster order on a tie
        var d = jr[b.self.id] - jr[a.self.id];
        return d !== 0 ? d : ord[a.self.id] - ord[b.self.id];
      });
      var take = Math.max(0, seatBudget(delibs.length) - core.length);
      var room = core.concat(pool.slice(0, take));
      if (room.length % 2 === 0) {                           // keep the room odd so the vote never ties
        if (pool.length > take) room.push(pool[take]);       // add the next-most-relevant, or
        else if (room.length > core.length) room.pop();      // drop the least-relevant (never below core)
      }
      return room.length ? room : delibs.filter(function (m) { return isCore(m.self.id) || isOn(m.self.id); });
    }
    // a very weak, low-level jitter so the ecosystem isn't perfectly static. Defaults to 0 (deterministic);
    // the mouth sets a small live value. Bounded: a score never moves more than `noise` of itself.
    function jitter(s) { var n = Number(cfg.noise) || 0; return n <= 0 ? s : Math.max(0, s * (1 + n * (rng() * 2 - 1))); }
    // Spontaneity also softens the WINNER pick: above 0, sample from the vote tally (softmax) instead of strict
    // argmax, so a close runner-up sometimes takes the floor. At 0 it returns null and the deterministic argmax
    // stands untouched. T rises with noise: a little noise barely bends toward argmax; a lot flattens the field.
    function sampleWinner(proposals, ballots, vetoed, noise) {
      if (!(noise > 0)) return null;
      var live = proposals.filter(function (p) { return vetoed.indexOf(p.by) < 0; });
      if (live.length < 2) return null;
      var tally = {}; live.forEach(function (p) { tally[p.by] = 0; });
      ballots.forEach(function (b) { if (b && b.scores) live.forEach(function (p) { tally[p.by] += Number(b.scores[p.by]) || 0; }); });
      var vals = live.map(function (p) { return tally[p.by]; });
      var max = Math.max.apply(null, vals), span = (max - Math.min.apply(null, vals)) || 1;
      var T = 0.05 + noise * 0.7, w = live.map(function (p) { return Math.exp(((tally[p.by] - max) / span) / T); });
      var sum = w.reduce(function (a, b) { return a + b; }, 0), r = rng() * sum, acc = 0;
      for (var i = 0; i < live.length; i++) { acc += w[i]; if (r <= acc) return live[i].by; }
      return live[live.length - 1].by;
    }

    // Run the live nations over a few candidate replies; tally their weighted votes through the Brain sub-system.
    function deliberate(candidates, ctx) {
      candidates = (candidates || []).filter(function (c) { return c && c.text != null; });
      if (!candidates.length) return Promise.resolve({ status: 'no-candidates', text: null, winnerId: null, nations: [], size: 0 });
      var live = roster.filter(function (n) { return isOn(n.id) && rosterKind(n.id) === 'deliberator'; });  // contributors supply material; they never vote (parity with deliberateIntents)
      var ballots = [], breakdown = [];
      live.forEach(function (n) {
        var w = weightOf(n.id), scores = {}, prefer = null, best = -Infinity;
        candidates.forEach(function (c) { var s = jitter(gauge(c.text, n.lean) * w); scores[c.by] = s; if (s > best) { best = s; prefer = c.by; } });
        ballots.push({ voter: n.id, scores: scores });
        breakdown.push({ id: n.id, weight: w, prefer: prefer });
      });
      var decide = (brain && brain.resolve) ? brain.resolve : localResolve;   // reuse the sub-system when present
      var decision = decide(candidates, ballots, [], {});
      decision.nations = breakdown;
      decision.size = live.length;
      return Promise.resolve(decision);
    }

    // A tiny built-in fallback so the layer still decides even if the Brain bundle isn't loaded — never refuse to work.
    // Mirrors brain.resolve's veto contract: vetoed proposals are dropped; if every one is blocked, it contests
    // (un-blocks them) rather than going silent, and reports vetoed/vetoReasons for the floor display.
    // A self-contained fallback for when no compiled Brain is injected. In the shipped app brain.min.js is inlined,
    // so this never runs there — but nation.js is reusable, and a consumer that loads the Brain asynchronously could
    // miss it. It mirrors brain.js's tie-break (tally -> confidence -> nomination order) and returns brain.js's full
    // schema and status vocabulary, so app code reading margin/consensus/dissent/status never hits an undefined field.
    // consensus/dissent are NOT re-derived here (that would duplicate the Brain and invite the very parity drift this
    // guards against) — a degraded fallback honestly reports them empty.
    function localResolve(props, ballots, vetoes, opts) {
      opts = opts || {}; vetoes = vetoes || [];
      var vetoQuorum = (opts.vetoQuorum != null) ? opts.vetoQuorum : 1, vetoCount = {}, vetoReasons = {};
      vetoes.forEach(function (v) { if (!v || v.against == null) return; vetoCount[v.against] = (vetoCount[v.against] || 0) + 1; (vetoReasons[v.against] = vetoReasons[v.against] || []).push({ by: v.by, reason: v.reason || '' }); });
      function isVetoed(by) { return (vetoCount[by] || 0) >= vetoQuorum; }
      var eligible = props.filter(function (p) { return !isVetoed(p.by); });
      var contested = false;
      if (!eligible.length && props.length) { eligible = props.slice(); contested = true; }
      var tally = {}, conf = {}, order = {};
      eligible.forEach(function (p, i) { tally[p.by] = 0; conf[p.by] = Number(p.conf) || 0; order[p.by] = i; });
      ballots.forEach(function (b) { if (b && b.scores) for (var k in b.scores) if (tally.hasOwnProperty(k)) tally[k] += Number(b.scores[k]) || 0; });
      var ranked = eligible.slice().sort(function (a, b) {
        if (tally[b.by] !== tally[a.by]) return tally[b.by] - tally[a.by];   // most votes
        if (conf[b.by] !== conf[a.by]) return conf[b.by] - conf[a.by];       // then confidence
        return order[a.by] - order[b.by];                                    // then nomination order (stable)
      });
      var win = ranked[0] || null, runnerUp = ranked[1] || null;
      var margin = win ? (tally[win.by] - (runnerUp ? tally[runnerUp.by] : 0)) : 0;
      return { winnerId: win ? win.by : null, text: win ? win.text : null,
        status: !win ? 'no-proposals' : (contested ? 'contested' : 'carried'),
        tally: tally, margin: margin, consensus: false, dissent: [],
        vetoed: Object.keys(vetoCount).filter(isVetoed), vetoReasons: vetoReasons };
    }

    // ---- self-knowledge: it knows what it is, and never refuses to say. ----
    var IDENTITY = {
      name: 'The Nation',
      is: 'the top layer of Chloe\u2019s mind \u2014 small faculties that together decide what she says.',
      does: 'When she\u2019s about to reply, a few candidate replies are drafted, and the council \u2014 the faculties seated that turn \u2014 votes on them through what each values. The votes are tallied by the weights you set, and the winner is spoken. An odd number is always seated, so a vote never ties.',
      purpose: 'To choose the kindest, truest, most fitting thing to say \u2014 while keeping her in character and keeping you well.',
      control: 'You\u2019re in full control: every faculty\u2019s weight, whether it\u2019s on, and the deliberation timeout live in Settings \u203a Brain. The memory and personality underneath stay yours too.'
    };
    function about(q) {
      q = String(q || '').toLowerCase();
      if (/purpose|why|point|for\b/.test(q)) return IDENTITY.purpose;
      if (/what.*do|how.*work|do you do|function/.test(q)) return IDENTITY.does;
      if (/who|what are you|your name|identity|are you/.test(q)) return 'I am ' + IDENTITY.name + ' \u2014 ' + IDENTITY.is;
      if (/control|weight|change|adjust|setting|turn off/.test(q)) return IDENTITY.control;
      if (/feel|mood|state|who.*spoke|reacting|sense|right now|aware/.test(q)) return report();
      if (/nation|list|seven|member|facult/.test(q)) return ['The faculties:'].concat(roster.map(function (n) {
        return '\u2022 ' + n.id + ' \u2014 ' + n.purpose + ' (weight ' + weightOf(n.id).toFixed(1) + ((isOn(n.id) || isCore(n.id)) ? '' : ', off') + ')';
      })).join('\n');
      // anything else: volunteer the whole picture rather than deflect
      return ['I am ' + IDENTITY.name + '. ' + IDENTITY.is, '', IDENTITY.does, '', 'Purpose: ' + IDENTITY.purpose, '', IDENTITY.control].join('\n');
    }

    // ---- the society's inner life: one pure mind per nation, wired live ----
    var minds = roster.map(function (n) { return n.kind === 'contributor' ? createSpecialist(n) : createMind(n); });  // heterogeneous: lean specialists vs full minds
    function mindOf(id) { for (var i = 0; i < minds.length; i++) if (minds[i].self.id === id) return minds[i]; return null; }
    function syncPersonas() { var per = cfg.persona || {}; deliberatorMinds().forEach(function (m) { m.setPersona(per[m.self.id] || null); }); }
    syncPersonas();
    var state = { lastSpeaker: null, lastText: null, turns: 0, lastUserText: null, lastUserValence: null, hurtStreak: 0 };
    function societySentiment() { var dm = deliberatorMinds(); var s = 0; dm.forEach(function (m) { s += m.user.sentiment; }); return r2(s / (dm.length || 1)); }
    function meanEngagement() { var dm = deliberatorMinds(); var s = 0; dm.forEach(function (m) { s += m.user.engagement; }); return r2(s / (dm.length || 1)); }
    function deliberatorMinds() { return minds.filter(function (m) { return rosterKind(m.self.id) === 'deliberator'; }); }

    // ---- the contributor tier (DESIGN-routing-layer.md §8): faculties that SUPPLY material, routed in on demand,
    //      never voting. Dormant by default (no contributor records) -> a no-op, so the turn is unchanged. ----
    var DEFAULT_SCHED = { set: function (fn, ms) { return setTimeout(fn, ms); }, clear: function (t) { clearTimeout(t); } };
    function contributorRecords() { return roster.filter(function (n) { return n.kind === 'contributor'; }); }
    // the registry index (DESIGN-specialists §6): resolve a DOMAIN to the contributors that own or recognize it.
    function findByDomain(d) { return contributorRecords().filter(function (n) { return isOn(n.id) && (n.domain || []).indexOf(d) >= 0; }).map(function (n) { return n.id; }); }
    function fringeFor(d) { return contributorRecords().filter(function (n) { return isOn(n.id) && (n.fringe || []).indexOf(d) >= 0; }).map(function (n) { return n.id; }); }
    function resolveNomination(d) {                                  // honest: owned / referred (fringe recognizes it) / unknown (nobody does)
      var owned = findByDomain(d), referred = fringeFor(d);
      return { domain: String(d), servedBy: owned, referredBy: referred, status: owned.length ? 'owned' : (referred.length ? 'referred' : 'unknown') };
    }
    // nomination (distributed routing): a SEATED deliberator can call in a specialist by domain. We read each seated
    // faculty's declared `nominate(vibe, ctx)`, resolve the domains honestly, and force-consult the owners this turn.
    function collectNominations(live, vibe, ctx) {
      var byDomain = {}, order = [];
      live.forEach(function (m) {
        var rec = rosterOf(m.self.id); if (!rec || typeof rec.nominate !== 'function') return;
        var raw; try { raw = rec.nominate(vibe, ctx); } catch (e) { raw = null; }              // a misbehaving faculty can't crash the turn
        var doms = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw ? [raw] : []);   // tolerate a bad return shape: string -> one domain, junk -> none
        doms.forEach(function (d) { d = String(d); if (!byDomain[d]) { byDomain[d] = []; order.push(d); } if (byDomain[d].indexOf(m.self.id) < 0) byDomain[d].push(m.self.id); });
      });
      var resolutions = order.map(function (d) { var r = resolveNomination(d); r.by = byDomain[d]; return r; });
      var ownerIds = [];
      resolutions.forEach(function (r) { r.servedBy.forEach(function (id) { if (ownerIds.indexOf(id) < 0) ownerIds.push(id); }); });
      return { resolutions: resolutions, ownerIds: ownerIds };
    }
    function selectContributors(vibe, forceIds) {
      forceIds = forceIds || [];
      return contributorRecords().filter(function (n) { return isOn(n.id) && (forceIds.indexOf(n.id) >= 0 || relevanceOf(n.id, vibe) >= 0.5); });
    }
    // consult the relevant contributors for MATERIAL, each behind withTimeout + a mandatory default (null), so a
    // slow / remote / dead one can never hang or poison the turn — it yields nothing and the vote proceeds. The
    // only async on this path, and it stays bounded. Returns a Promise of { id: material }. Contributors never vote.
    function consultContributors(vibe, ctx, forceIds) {
      var picks = selectContributors(vibe, forceIds);
      if (!picks.length) return Promise.resolve({});                       // dormant / nothing relevant: no-op
      var ms = (cfg.contributorTimeoutMs != null) ? cfg.contributorTimeoutMs : (cfg.timeoutMs != null ? cfg.timeoutMs : 1500);
      var sched = cfg.sched || DEFAULT_SCHED;
      var wt = (brain && brain.withTimeout) ? brain.withTimeout : null;
      var view = Object.freeze(Object.assign({}, ctx));                    // a contributor reads ctx but cannot mutate the turn
      return Promise.all(picks.map(function (n) {
        var call = Promise.resolve().then(function () { return n.consult ? n.consult(view, vibe) : null; });
        var guarded = wt ? wt(call, ms, null, sched) : call.then(function (v) { return { __timeout: false, value: v }; }, function () { return { __timeout: false, value: null }; });
        return guarded.then(function (res) { return { id: n.id, material: (res && !res.__timeout) ? res.value : null }; });
      })).then(function (rows) {
        var material = {};
        rows.forEach(function (r) { if (r.material != null) material[r.id] = r.material; });
        return material;
      });
    }

    // PASS 1 — APPRAISAL (DESIGN-appraisal-chamber.md): the non-routable core (instinct/conscience/heart) read the
    // latest user turn into ONE shared, frozen vibe. Pure. `sentiment` keeps its single source of truth — the
    // affect read's valence when present, this layer's cues otherwise — via perceive/societySentiment.
    function appraise() {
      var raw = String(state.lastUserText || '');
      var cues = read(raw);
      var sentiment = societySentiment();
      var emotes = (raw.replace(/\*\*[^*]+\*\*/g, ' ').match(/\*[^*]+\*/g) || []).length;  // *…* spans, bold stripped
      var vibe = {
        v: 2,
        tension:       clamp01(sat(cues.anger)),                                   // instinct
        vulnerability: clamp01(sat(cues.distress) * 0.7 + neg(sentiment) * 0.5),   // conscience
        warmth:        clamp01(sat(cues.warmth + cues.humor) * 0.6 + pos(sentiment) * 0.5), // heart
        sentiment:     sentiment,
        engagement:    meanEngagement(),
        openness:      clamp01(cues.question),
        narrative:     clamp01(sat(emotes))                                        // scene/roleplay beat (v2)
      };
      // sustained hostility aimed at HER wears her down. Rises after a couple of hits, suppressed inside an active
      // scene (in-character heat is consensual), and it deepens her vulnerability so the council reads her as hurting.
      vibe.hurt = r2(clamp01((state.hurtStreak - 2) / 6) * (1 - vibe.narrative * 0.7));
      if (vibe.hurt > 0) vibe.vulnerability = clamp01(vibe.vulnerability + vibe.hurt * 0.5);
      vibe.safety = clamp01(1 - Math.max(vibe.tension, vibe.vulnerability * 0.7));
      vibe.delight = clamp01(vibe.warmth * 0.6 + pos(sentiment) * 0.6 - vibe.tension * 0.5);   // her own lift — read warmth + good feeling, dampened by tension
      var shift = state.affectShift || { up: 0, down: 0 };
      vibe.surprise = clamp01((shift.up + shift.down) * 2.5);   // magnitude of a sudden swing either way
      vibe.letdown  = clamp01(shift.down * 2.5);                // the tenor dropped — a let-down
      vibe.tone = toneOf(vibe);
      if (vibe.hurt >= 0.6) vibe.tone = 'wounded';                                 // worn past rebuff into visible hurt
      return Object.freeze(vibe);                            // strategy reads, never writes
    }

    // perceive a turn across the whole society (the user spoke / a character spoke / a member spoke)
    function perceive(turn) {
      if (!turn || turn.text == null) return null;
      var reactions = [];
      deliberatorMinds().forEach(function (m) { m.perceive(turn); reactions.push(m.react(turn)); });   // specialists don't feel
      state.turns++;
      if (turn.role === 'user') {
        state.lastUserText = turn.text; state.lastUserValence = (turn.valence != null) ? turn.valence : null;
        var hr = read(turn.text);                                                              // hostility aimed AT her builds; warmth mends it, a neutral turn lets it cool
        if (hr.anger >= 1 && hr.warmth < 1) state.hurtStreak = Math.min(12, state.hurtStreak + 1);
        else if (hr.warmth >= 1 || (turn.valence != null && turn.valence > 0.2)) state.hurtStreak = Math.max(0, state.hurtStreak - 3);
        else state.hurtStreak = Math.max(0, state.hurtStreak - 1);
        var nowSent = societySentiment();                                                   // her felt shift in the relationship's tenor
        var prevS = (state.prevSentiment != null) ? state.prevSentiment : nowSent;
        state.affectShift = { up: Math.max(0, nowSent - prevS), down: Math.max(0, prevS - nowSent) };
        state.prevSentiment = nowSent;
      }
      return { cues: read(turn.text), sentiment: societySentiment(), reactions: reactions };
    }

    // PURELY decide who speaks and with what intent — no model call. Each live mind proposes an intent; the
    // society cross-votes (bond + mood + weight + weak noise); the Brain sub-system resolves a winner.
    function deliberateIntents(ctx, opts) {
      ctx = ctx || {}; opts = opts || {};
      var vibe = appraise();                                 // PASS 1 — appraisal (fixed core; one shared frozen vibe)
      var live = route(vibe, ctx);                          // routing: core (always) + top-K by relevance (DESIGN-routing-layer.md)
      if (opts.promote) live = ensureSeated(live, opts.promote);   // /nation <id> --speak: force the addressed node into the room
      if (!live.length) return Promise.resolve({ status: 'no-minds', speaker: null, intent: null, floor: [], vibe: vibe });
      // contributor tier: consult for material first (async, timeout-guarded). Dormant -> resolves {} immediately,
      // so the vote below is unchanged. Material is additive context the deliberators MAY read; it never votes.
      var nom = collectNominations(live, vibe, ctx);          // seated faculties may call in specialists by domain
      var forceIds = nom.ownerIds.slice();
      if (opts.promote && rosterKind(opts.promote) === 'contributor') forceIds.push(opts.promote);
      return consultContributors(vibe, ctx, forceIds).then(function (material) {
        var hasMat = false; for (var k in material) { hasMat = true; break; }
        var vctx = hasMat ? Object.assign({}, ctx, { material: material }) : ctx;
        var proposals = live.map(function (m) { var it = m.intend(vctx, vibe); return { by: it.by, text: it.kind, conf: it.strength, intent: it }; });
        var ballots = live.map(function (m) { var sc = {}; proposals.forEach(function (p) { sc[p.by] = jitter(m.voteIntent(p.intent, vctx) * weightOf(p.by, vibe)); }); return { voter: m.self.id, scores: sc }; });
        // each mind may BLOCK a proposal it guards against (conscience/instinct); the Society resolves the vetoes.
        var vetoes = [];
        live.forEach(function (m) { proposals.forEach(function (p) { var v = m.veto && m.veto(p); if (v) vetoes.push(v); }); });
        var decide = (brain && brain.resolve) ? brain.resolve : localResolve;
        var decision = decide(proposals, ballots, vetoes, { vetoQuorum: 1 });
        if (!opts.promote) {                                  // addressing already overrides the vote; never resample over it
          var sampled = sampleWinner(proposals, ballots, decision.vetoed || [], Number(cfg.noise) || 0);
          if (sampled) decision.winnerId = sampled;           // spontaneity may hand the floor to a close runner-up
        }
        var win = proposals.filter(function (p) { return p.by === decision.winnerId; })[0] || proposals[0];
        decision.speaker = win ? mindOf(win.by).self : null;
        decision.intent = win ? win.intent : null;
        if (opts.promote) applyPromotion(decision, opts.promote, proposals, vetoes, vibe, material);  // addressing overrides the VOTE, never the FLOOR
        decision.floor = proposals.map(function (p) { return { id: p.by, kind: p.intent.kind, strength: r2(p.intent.strength), persona: p.intent.persona && p.intent.persona.name || null }; });
        state.lastRoom = live.map(function (m) { return m.self.id; });                    // for /nation self-report (pure observability)
        state.lastIntents = {}; proposals.forEach(function (p) { state.lastIntents[p.by] = { kind: p.intent.kind, strength: r2(p.intent.strength) }; });
        state.lastWinner = decision.winnerId || state.lastWinner || null;
        decision.vibe = vibe;                                // expose the read (debuggable; the router's input next turn)
        decision.routing = routingTelemetry(vibe, live, selectContributors(vibe, forceIds).map(function (n) { return n.id; }));  // expose WHY the room formed (pure)
        decision.routing.nominations = nom.resolutions;      // which domains were called in, resolved honestly (owned/referred/unknown)
        if (hasMat) decision.material = material;            // expose what was consulted
        return decision;
      });
    }
    // after the chosen line is voiced, every mind reacts to it — the speaker to itself, the rest to a peer
    function reactToSpoken(speakerId, text) {
      var sp = mindOf(speakerId); if (sp && sp.said) sp.said(text);
      state.lastSpeaker = speakerId; state.lastText = text;
      deliberatorMinds().forEach(function (m) { m.react({ who: speakerId, role: m.self.id === speakerId ? 'self' : 'other', text: text }); });
    }
    // fold the user's reaction (like / dislike / kept-talking) back into every mind
    function ingestReaction(sig) {
      sig = sig || {}; var d = (sig.kind === 'up' || sig.kind === 'keep') ? 0.3 : (sig.kind === 'down' ? -0.4 : 0);
      deliberatorMinds().forEach(function (m) { m.user.sentiment = clamp11(m.user.sentiment + d * 0.5); if (sig.toward) m.bonds[sig.toward] = clamp11((m.bonds[sig.toward] || 0) + d); });
    }
    function setUserDescription(desc) { deliberatorMinds().forEach(function (m) { m.user.description = String(desc || ''); }); }
    // a live, human-readable self-report — what it is right now, who spoke, how it reads you, how each mind feels
    function report() {
      var s = societySentiment();
      var lines = ['Right now: ' + (state.lastSpeaker ? (state.lastSpeaker + ' last took the floor') : 'no one has spoken yet') + '; I read you as ' + (s > 0.15 ? 'warming' : (s < -0.15 ? 'struggling' : 'steady')) + '.'];
      minds.filter(function (m) { return isOn(m.self.id); }).forEach(function (m) {
        var d = m.describe();
        if (d.kind === 'contributor') { lines.push('\u2022 ' + d.id + ' \u2014 specialist (' + (d.domain || []).join(', ') + '); supplies material, doesn\u2019t feel or vote'); return; }
        lines.push('\u2022 ' + d.id + (d.persona ? (' (as ' + d.persona + ')') : '') + ' \u2014 mood ' + d.mood + ', reads you ' + d.readsUser + (d.lastSaid ? (', last said \u201c' + String(d.lastSaid).slice(0, 40) + '\u2026\u201d') : ''));
      });
      return lines.join('\n');
    }

    // addressing promotion (DESIGN-specialists-addressing-fringe §5): force the addressed node into the room, and
    // after the vote make it the speaker — UNLESS a guard vetoed it. Overrides the vote, never the floor.
    function ensureSeated(live, id) {
      if (!isOn(id) || rosterKind(id) !== 'deliberator') return live;   // can't force-seat a disabled node or a contributor
      for (var i = 0; i < live.length; i++) { if (live[i].self.id === id) return live; }
      var m = mindOf(id); return m ? live.concat([m]) : live;
    }
    function applyPromotion(decision, pid, proposals, vetoes, vibe, material) {
      if (rosterKind(pid) === 'contributor') {                       // a contributor speaks by surfacing its MATERIAL, not an intent
        if (!isOn(pid)) { decision.promotion = { requested: pid, granted: false, reason: 'contributor is off' }; return; }
        if (vibe.safety < 0.5) { decision.promotion = { requested: pid, granted: false, reason: 'held by the guard floor (the moment is not safe for a tangent)' }; return; }  // floor for non-intent speakers = the safety read
        decision.winnerId = pid; decision.speaker = mindOf(pid).self;
        decision.intent = { by: pid, kind: 'material', material: (material || {})[pid] != null ? material[pid] : null };
        decision.promotion = { requested: pid, granted: true, as: 'material' };
        decision.status = 'promoted';                                  // the winner was addressed, not voted — don't let status/tally imply agreement
        return;
      }
      var pProp = null;
      for (var i = 0; i < proposals.length; i++) { if (proposals[i].by === pid) { pProp = proposals[i]; break; } }
      if (!pProp) { decision.promotion = { requested: pid, granted: false, reason: 'not an active deliberator (off or unknown)' }; return; }
      var blockers = [];
      vetoes.forEach(function (v) { if (v && v.against === pid) blockers.push(v.by); });
      if (blockers.length) { decision.promotion = { requested: pid, granted: false, reason: 'held by the guard floor', vetoedBy: blockers }; return; }  // floor wins: keep resolve's protective speaker
      decision.winnerId = pid; decision.speaker = mindOf(pid).self; decision.intent = pProp.intent;
      decision.promotion = { requested: pid, granted: true };
      decision.status = 'promoted';                                    // addressed to the floor, not elected by the vote
    }

    // routing telemetry (adopted from the external review): a pure, additive readout of WHY the room formed —
    // who seated (with relevance + effective weight), who was benched, and the contributor standing. Rides on the
    // decision; reading it never changes a decision.
    function routingTelemetry(vibe, live, consultedIds) {
      consultedIds = consultedIds || [];
      var seatedIds = live.map(function (m) { return m.self.id; });
      var delibs = roster.filter(function (n) { return rosterKind(n.id) === 'deliberator'; });
      var seated = [], benched = [];
      delibs.forEach(function (n) {
        if (!isCore(n.id) && !isOn(n.id)) return;                       // config-off non-core: out of play this turn
        var rel = r2(relevanceOf(n.id, vibe));
        if (seatedIds.indexOf(n.id) >= 0) seated.push({ id: n.id, core: isCore(n.id), relevance: rel, weight: r2(weightOf(n.id, vibe)) });
        else benched.push({ id: n.id, relevance: rel });
      });
      var contributors = contributorRecords().filter(function (n) { return isOn(n.id); }).map(function (n) {
        var rel = r2(relevanceOf(n.id, vibe)); return { id: n.id, relevance: rel, consulted: consultedIds.indexOf(n.id) >= 0 };  // ACTUAL (relevance OR nomination/promotion), not just predicted
      });
      return { seatBudget: seatBudget(delibs.length), coreCount: delibs.filter(function (n) { return isCore(n.id); }).length,
        seated: seated, benched: benched, contributors: contributors };
    }

    // ---- /nation addressing & self-report (DESIGN-specialists-addressing-fringe.md §5,§7): any node can speak
    //      for itself — its standing in the live moment — and the whole council can be inspected. PURE: reads only
    //      existing state, never touches the decision path, so decisions stay byte-identical when these go unused. ----
    function routeIds(vibe) { return route(vibe, {}).map(function (m) { return m.self.id; }); }
    function standingOf(id, vibe, seated) {
      if (isCore(id)) return 'core';                               // non-maskable: always in the room, even if config 'disables' it (route seats it regardless)
      if (!isOn(id)) return 'off';
      if (rosterKind(id) === 'contributor') return relevanceOf(id, vibe) >= 0.5 ? 'consulted' : 'idle';
      return (seated || routeIds(vibe)).indexOf(id) >= 0 ? 'seated' : 'benched';
    }
    function saysLine(id, rep) {
      var who = id.charAt(0).toUpperCase() + id.slice(1), rel = rep.relevance, stance;
      if (rep.standing === 'core') stance = 'I\u2019m always in the room \u2014 I don\u2019t leave.';
      else if (rep.standing === 'off') stance = 'I\u2019m switched off right now.';
      else if (rep.standing === 'benched') stance = 'this isn\u2019t my moment (' + rel + ') \u2014 I\u2019m sitting it out so the right voice leads.';
      else if (rep.standing === 'seated') stance = (rel >= 0.5)
        ? 'this reads like my moment (' + rel + ') \u2014 I\u2019d take the floor if the vote turns my way.'
        : 'I\u2019m in the room, but this isn\u2019t really my moment (' + rel + ') \u2014 I\u2019ll likely defer to a stronger voice.';
      else if (rep.standing === 'consulted') stance = 'I\u2019m relevant here (' + rel + ') \u2014 ask me and I\u2019ll bring what I know.';
      else stance = 'nothing here is mine (' + rel + ') \u2014 I\u2019d point you elsewhere.';
      return 'I\u2019m ' + who + '. ' + (rep.purpose || '') + ' Right now, ' + stance;
    }
    function selfReport(id, vibe, seated) {
      var n = rosterOf(id);
      if (!n) return { error: 'no such nation: ' + id, known: roster.map(function (r) { return r.id; }) };
      vibe = vibe || appraise();
      var standing = standingOf(id, vibe, seated);
      var li = (state.lastIntents || {})[id] || null;
      var rep = {
        id: id, kind: rosterKind(id), core: isCore(id), purpose: n.purpose,
        domain: n.domain || [], fringe: n.fringe || [],
        relevance: r2(relevanceOf(id, vibe)),
        weight: r2(weightOf(id, vibe)),
        wouldSeat: standing === 'core' || standing === 'seated',
        standing: standing,
        lastIntent: li ? { kind: li.kind, strength: li.strength } : null,
        spokeLast: state.lastWinner === id
      };
      var m = mindOf(id);                                          // a full mind adds its own view; a specialist omits it
      if (m && rep.kind !== 'contributor') { var d = m.describe(); rep.mood = d.mood; rep.reads = d.readsUser; rep.lastSaid = d.lastSaid; }
      rep.says = saysLine(id, rep);
      return rep;
    }
    function inspect(vibe) {
      vibe = vibe || appraise();
      var seated = routeIds(vibe);                                 // computed once, shared across the council
      var council = roster.map(function (n) { return selfReport(n.id, vibe, seated); })
        .sort(function (a, b) { return b.relevance - a.relevance; });
      return { vibe: { tone: vibe.tone, narrative: vibe.narrative, safety: vibe.safety, vulnerability: vibe.vulnerability, tension: vibe.tension, warmth: vibe.warmth }, room: seated, council: council };
    }
    function address(text, vibe) {                                 // the /nation command parser
      var s = String(text || '').trim().replace(/^\/nation\b/, '').trim();
      if (!s) return inspect(vibe);
      var toks = s.split(/\s+/), id = toks[0];
      if (toks.indexOf('--speak') >= 0) return { action: 'promote', id: id };   // hand back to the caller: deliberateIntents(ctx, { promote: id })
      return selfReport(id, vibe);
    }

    return { deliberate: deliberate, about: about, nations: roster, identity: IDENTITY, weightOf: weightOf, isOn: isOn,
      minds: minds, mindOf: mindOf, syncPersonas: syncPersonas, setUserDescription: setUserDescription, report: report,
      selfReport: selfReport, inspect: inspect, address: address, resolveNomination: resolveNomination, findByDomain: findByDomain,
      perceive: perceive, deliberateIntents: deliberateIntents, reactToSpoken: reactToSpoken, ingestReaction: ingestReaction, state: state };
  }

  return { NATIONS: NATIONS, EXTRAS: EXTRAS, createArmy: createArmy, gauge: gauge, modulate: modulate, toneOf: toneOf };
});

/* chloe-reader-core — the shared machinery behind the felt-state readers. A mean-reverting blend over a fixed
 * set of named states: cue-read per turn, EWMA toward what was signalled, relax toward a resting distribution,
 * time-decay stale state on load, lossless round-trip. stance.js and affect.js are thin configs over this; one
 * place to fix or harden the dynamics. (topics.js is a different, dynamic-field shape and stays separate.) */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChloeReaderCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clone(states, v) { var o = {}; states.forEach(function (s) { o[s] = +v[s] || 0; }); return o; }
  function renorm(states, v) {
    var sum = states.reduce(function (a, s) { return a + Math.max(0, v[s]); }, 0);
    if (sum <= 0) { var u = 1 / states.length; states.forEach(function (s) { v[s] = u; }); return v; }
    states.forEach(function (s) { v[s] = Math.max(0, v[s]) / sum; });
    return v;
  }
  // signals[state] is a regex OR an array of regexes; a turn's "pull" toward a state = how many of its cues fire.
  function read(states, signals, text) {
    var t = String(text || ''); var pulls = {};
    states.forEach(function (s) {
      var spec = signals[s], arr = Array.isArray(spec) ? spec : [spec], n = 0;
      arr.forEach(function (re) { if (re && re.test(t)) n += 1; });
      pulls[s] = n;
    });
    return pulls;
  }

  // opts: states[], signals{}, resting{} (distribution to relax + time-decay toward), alpha (EWMA move/turn),
  //   relax (per-turn drift toward resting; 0 = hold), decayPerHour (stale-load fade), labelKey (blend item key),
  //   derive (fn(vector)->extra snapshot fields, e.g. valence/arousal), initial (persisted {..states, at}), now.
  function createReader(opts) {
    opts = opts || {};
    var states = opts.states;
    var signals = opts.signals || {};
    var resting = renorm(states, clone(states, opts.resting || {}));
    var alpha = (opts.alpha == null) ? 0.25 : Number(opts.alpha);
    var relax = (opts.relax == null) ? 0 : Number(opts.relax);
    var decayPerHour = (opts.decayPerHour == null) ? 0.85 : Number(opts.decayPerHour);
    var labelKey = opts.labelKey || 'state';
    var derive = (typeof opts.derive === 'function') ? opts.derive : null;
    var now = (typeof opts.now === 'function') ? opts.now : function () { return Date.now(); };
    var init = opts.initial || null;
    function oneHot(s) { var o = {}; states.forEach(function (k) { o[k] = (k === s) ? 1 : 0; }); return o; }
    var pinned = (init && init.pinned && states.indexOf(init.pinned) >= 0) ? init.pinned : null;   // user override: a forced posture
    var vec = pinned ? oneHot(pinned) : renorm(states, init ? clone(states, init) : clone(states, resting));
    var lastAt = (init && init.at) ? init.at : now();
    // stale-load: relax the loaded state toward resting by the wall-clock gap — but a PIN is intentional, never fades.
    if (init && init.at && !pinned) {
      var hrs = Math.max(0, (now() - init.at) / 3600000);
      if (hrs > 0) { var mult = Math.pow(decayPerHour, hrs); states.forEach(function (s) { vec[s] = resting[s] + (vec[s] - resting[s]) * mult; }); renorm(states, vec); }
    }

    function observe(text) {
      lastAt = now();
      if (pinned) return snapshot();   // a pinned posture freezes inference — the user is driving
      if (relax > 0) states.forEach(function (s) { vec[s] = vec[s] * (1 - relax) + resting[s] * relax; });   // drift toward resting
      var pulls = read(states, signals, text);
      var total = states.reduce(function (a, s) { return a + pulls[s]; }, 0);
      if (total > 0) {
        var target = {}; states.forEach(function (s) { target[s] = pulls[s] / total; });
        states.forEach(function (s) { vec[s] = vec[s] * (1 - alpha) + target[s] * alpha; });
      }
      renorm(states, vec);
      return snapshot();
    }
    function snapshot() {
      var ranked = states.slice().sort(function (a, b) { return vec[b] - vec[a]; });
      var snap = { vector: clone(states, vec), dominant: ranked[0], pinned: pinned,
        blend: ranked.slice(0, 2).map(function (s) { var o = {}; o[labelKey] = s; o.weight = Math.round(vec[s] * 100) / 100; return o; }) };
      if (derive) { var ex = derive(snap.vector) || {}; Object.keys(ex).forEach(function (k) { snap[k] = ex[k]; }); }
      return snap;
    }
    function persist() { var o = clone(states, vec); o.at = lastAt; o.pinned = pinned; return o; }
    function pin(s) { if (states.indexOf(s) >= 0) { pinned = s; vec = oneHot(s); lastAt = now(); } return snapshot(); }
    function unpin() { pinned = null; lastAt = now(); return snapshot(); }   // vec stays; inference resumes from here
    return { observe: observe, snapshot: snapshot, read: function (t) { return read(states, signals, t); },
      pin: pin, unpin: unpin, isPinned: function () { return pinned; },
      get: persist, set: function (v) { if (v) { vec = renorm(states, clone(states, v)); pinned = (v.pinned && states.indexOf(v.pinned) >= 0) ? v.pinned : null; lastAt = v.at || now(); } },
      reset: function () { vec = clone(states, resting); pinned = null; lastAt = now(); } };
  }

  return { clone: clone, renorm: renorm, read: read, createReader: createReader };
});

/* chloe-stance — reads the conversation's STANCE (companion/roleplay/author/assist) as a mean-reverting blend.
 * Pure, deterministic, no model. OBSERVE + REPORT only — acting on the blend is gated elsewhere. The dynamics
 * (EWMA, relax-to-neutral, time-decay-on-load) live in reader-core; this file is the stance config over it. */
(function (root, factory) {
  'use strict';
  var core = (root && root.ChloeReaderCore) || (typeof require !== 'undefined' ? require('./reader-core.js') : null);
  var api = factory(core);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChloeStance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';

  var STANCES = ['companion', 'roleplay', 'author', 'assist'];

  // Pure cue signals — each distinct match is a "pull" toward a stance. Inspectable on purpose; no model.
  var SIGNALS = {
    roleplay: [
      /\*[^*]{2,}\*/,                                                        // *brushes hair from her face*
      /\b(he|she|they|you)\s+(walks?|grabs?|leans?|smiles?|reaches?|draws?|steps?|turns?|whispers?|nods?|glances?)\b/i,
      /\b(the|a|an)\s+\w+\s+(room|hall|forest|castle|tavern|street|battlefield|chamber|garden|dungeon)\b/i,
      /^\s*[\(\[][^\)\]]{3,}[\)\]]\s*$/                                      // (a parenthetical stage direction)
    ],
    assist: [
      /\bhow (do|can|should|would) i\b/i,
      /\b(help me|fix|debug|explain|implement|write me|generate|refactor|optimi[sz]e)\b/i,
      /\b(error|bug|function|code|api|regex|syntax|install|config|command)\b/i,
      /\b(step by step|tutorial|example of)\b/i
    ],
    companion: [
      /\bi(?:'m| am| feel| felt| was|m)\s+(?:so |really |kinda |pretty |a bit )?(sad|alone|lonely|tired|exhausted|anxious|scared|down|empty|happy|excited|okay|fine|stressed|overwhelmed)\b/i,
      /\bi (just )?(need|want|wanted) to (talk|vent|tell you)\b/i,
      /\b(my day|at work|my mom|my dad|my friend|can'?t stop thinking)\b/i,
      /\bhow are you\b/i
    ],
    author: [
      /\b(let'?s|can we|keep|continue) (writ|continu|go on)/i,
      /\bnext (chapter|scene|paragraph|part|line|verse)\b/i,
      /\b(write|draft|compose) (the|a|an|me a) (story|scene|poem|chapter|dialogue|verse)\b/i,
      /\b(plot|character arc|narrator|prose|stanza)\b/i
    ]
  };

  var UNIFORM = { companion: 0.25, roleplay: 0.25, author: 0.25, assist: 0.25 };

  function createReader(opts) {
    opts = opts || {};
    return core.createReader({
      states: STANCES, signals: SIGNALS, resting: UNIFORM,
      alpha: (opts.alpha == null) ? 0.25 : Number(opts.alpha),
      relax: (opts.relax == null) ? 0.04 : Number(opts.relax),          // slow drift toward neutral (cools a held mode over a lull)
      decayPerHour: (opts.decayPerHour == null) ? 0.75 : Number(opts.decayPerHour),
      labelKey: 'stance', initial: opts.initial, now: opts.now
    });
  }

  return { STANCES: STANCES, read: function (t) { return core.read(STANCES, SIGNALS, t); }, createReader: createReader };
});

/* chloe-affect — a fuller read of the conversation's emotional field as a mean-reverting blend over named
 * states (warm/bright/calm/sad/hurt/angry/afraid/longing), with derived valence/arousal. Pure, deterministic,
 * no model. OBSERVE + REPORT only. The dynamics live in reader-core; this file is the affect config over it. */
(function (root, factory) {
  'use strict';
  var core = (root && root.ChloeReaderCore) || (typeof require !== 'undefined' ? require('./reader-core.js') : null);
  var api = factory(core);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChloeAffect = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';

  var STATES = ['warm', 'bright', 'calm', 'sad', 'hurt', 'angry', 'afraid', 'longing'];

  // Pure cue lexicon — each match is a pull toward a named emotional state. Inspectable on purpose; no model.
  var LEX = {
    warm:    /\b(love|care|here for you|thank|thanks|appreciate|glad|sweet|dear|hug|miss you|proud of you)\b/i,
    bright:  /\b(haha+|lol|lmao|yay|woohoo|awesome|amazing|excited|thrilled|wonderful|can'?t wait|let'?s go)\b|!!/i,
    calm:    /\b(okay|ok|fine|alright|relax|chill|rest|quiet|peace|calm|no worries|np|sure|steady)\b/i,
    sad:     /\b(sad|lonely|alone|cry|crying|miss|lost|empty|hopeless|down|grief|mourn|heartbroken|sigh)\b/i,
    hurt:    /\b(hurt|why would you|you don'?t|you never|ignored|rejected|betrayed|let me down|disappointed|unfair)\b/i,
    angry:   /\b(angry|mad|furious|rage|raging|hate|stupid|shut up|annoying|annoyed|pissed|damn it|wtf|enough)\b/i,
    afraid:  /\b(scared|afraid|terrified|panic|panicking|anxious|nervous|worried|fear|dread|what if|freaking out)\b/i,
    longing: /\b(want|need|crave|wish|long for|yearn|desire|come here|i want you|hold me|closer|don'?t leave)\b/i
  };

  var BASE = { warm: 0.30, bright: 0.10, calm: 0.34, sad: 0.06, hurt: 0.05, angry: 0.04, afraid: 0.05, longing: 0.06 };

  // valence: positive states minus negative ones (longing leans mildly positive). [-1, 1].
  function valenceOf(v) { return Math.round(((v.warm + v.bright + 0.3 * v.longing) - (v.sad + v.hurt + v.angry + v.afraid)) * 100) / 100; }
  // arousal: activated states minus settled ones. [0, 1].
  function arousalOf(v) { return Math.round(Math.max(0, Math.min(1, 0.5 + 0.5 * ((v.bright + v.angry + v.afraid + 0.6 * v.longing) - (v.calm + 0.6 * v.sad)))) * 100) / 100; }

  // A voice-coloring hint from the read — a tone QUALITY (how she sounds), never a feeling to announce. Baseline
  // (calm / ordinary warmth) returns nothing, so most turns stay uncolored; only a notable tenor gets a hint.
  var TONE = {
    sad: 'a soft, gentle heaviness', hurt: 'a guarded, slightly wounded edge', angry: 'a cooler, sharper edge held in check',
    afraid: 'an unsettled, careful wariness', longing: 'a yearning, drawn-toward warmth', bright: 'a light, buoyant brightness'
  };
  function toneHint(snap) {
    if (!snap || !snap.vector) return null;
    var v = snap.vector, dom = snap.dominant;
    if (TONE[dom] && (v[dom] || 0) >= 0.28) return TONE[dom];
    if ((v.warm || 0) >= 0.45) return 'an unusual tenderness';   // warmth well above its resting baseline
    return null;
  }
  // The model line: color the VOICE, never narrate the feeling. Empty unless a notable tenor is present.
  function feltDirective(snap) {
    var t = toneHint(snap);
    if (!t) return '';
    return 'Let the emotional tenor of the moment color your voice right now \u2014 ' + t + ' \u2014 but do not name it, announce it, or explain it. It shapes HOW you speak, never becomes WHAT you say.';
  }

  function createReader(opts) {
    opts = opts || {};
    return core.createReader({
      states: STATES, signals: LEX, resting: (opts.resting || BASE),
      alpha: (opts.alpha == null) ? 0.30 : Number(opts.alpha),
      relax: (opts.revert == null) ? 0.12 : Number(opts.revert),         // emotions fade toward baseline each turn (she recovers, never spirals)
      decayPerHour: (opts.decayPerHour == null) ? 0.85 : Number(opts.decayPerHour),
      labelKey: 'emotion',
      derive: function (v) { return { valence: valenceOf(v), arousal: arousalOf(v) }; },
      initial: opts.initial, now: opts.now
    });
  }

  return { STATES: STATES, BASE: BASE, toneHint: toneHint, feltDirective: feltDirective, read: function (t) { return core.read(STATES, LEX, t); }, createReader: createReader };
});

/* chloe-topics — tracks what the conversation is ABOUT over time: a small set of live topics, each with a
 * decaying INTEREST weight (engagement + returns-to). Pure, deterministic, no model — salient words per turn
 * bump their interest, everything else ages. OBSERVE + REPORT only: it shows the topic field and changes
 * nothing. Ideas + her-own-goals (later slices) draw on this interest model. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChloeTopics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // common words that are never topics (kept compact; extend freely)
  var STOP = ('the a an and or but if then so of to in on at for with from by as is are was were be been being ' +
    'do does did have has had i you he she it we they me him her us them my your his its our their this that these ' +
    'those what which who whom whose when where why how not no yes ok okay just really very too also can could ' +
    'would should will shall may might must about into over under out up down off than them then there here ' +
    'get got going gonna wanna like want need know think feel make made say said tell told thing things lot ' +
    'good bad nice cool yeah yep nope hey hi hello thanks thank please sorry well right sure now today ' +
    'anyway anyhow actually basically literally honestly seriously obviously definitely probably maybe perhaps ' +
    'however though although because since while whatever somehow stuff kinda sorta gotta lemme okay').split(/\s+/)
    .reduce(function (m, w) { m[w] = 1; return m; }, {});

  // salient candidate topics from one line: proper-noun-ish (Capitalized) first, then long content words.
  function extract(text) {
    var raw = String(text || '');
    var proper = (raw.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || []).map(function (w) { return w.toLowerCase(); });
    var words = (raw.toLowerCase().match(/\b[a-z][a-z'-]{3,}\b/g) || []);
    var out = [], seen = {};
    proper.concat(words).forEach(function (w) {
      w = w.replace(/['-]+$/, '');
      if (w.length < 4 || STOP[w] || seen[w]) return;
      seen[w] = 1; out.push(w);
    });
    return out.slice(0, 4);   // a few most-salient per turn
  }

  function createReader(opts) {
    opts = opts || {};
    var decay = (opts.decay == null) ? 0.82 : Number(opts.decay);   // per-turn interest fade
    var bump  = (opts.bump  == null) ? 0.45 : Number(opts.bump);    // interest added on mention (accumulates -> returns-to win)
    var cap   = (opts.cap   == null) ? 6 : (opts.cap | 0);          // live-topic ceiling
    var floor = (opts.floor == null) ? 0.08 : Number(opts.floor);   // drop below this
    var decayPerHour = (opts.decayPerHour == null) ? 0.80 : Number(opts.decayPerHour);
    var now = (typeof opts.now === 'function') ? opts.now : function () { return Date.now(); };
    function clone(o) { var c = {}; Object.keys(o || {}).forEach(function (k) { c[k] = o[k]; }); return c; }
    // sanitize a loaded field: keep only finite, positive interests, clamped to <= 1 — the load floor/ceiling
    // (a corrupt persisted 5 or NaN can't survive to dominate the ranking).
    function sanitize(o) { var c = {}; Object.keys(o || {}).forEach(function (k) { var v = +o[k]; if (isFinite(v) && v > 0) c[k] = Math.min(1, v); }); return c; }
    var field = {};            // { topic: interest in (0,1] }
    var lastSeen = null;       // most-recently-bumped topic (the "current" one)
    var lastAt = now();
    if (opts.initial && opts.initial.field) {
      field = sanitize(opts.initial.field);
      lastSeen = opts.initial.current || null;
      lastAt = opts.initial.at || now();
      // stale-load: fade interest by the wall-clock gap so day-old topics don't reload hot.
      if (opts.initial.at) {
        var hrs = Math.max(0, (now() - opts.initial.at) / 3600000);
        if (hrs > 0) { var mult = Math.pow(decayPerHour, hrs); Object.keys(field).forEach(function (k) { field[k] *= mult; }); }
      }
    }

    function prune() {
      Object.keys(field).forEach(function (k) { if (!(field[k] >= floor)) delete field[k]; });   // also drops NaN
      var ranked = Object.keys(field).sort(function (a, b) { return field[b] - field[a]; });
      ranked.slice(cap).forEach(function (k) { delete field[k]; });   // keep only the top `cap`
    }
    prune();   // apply floor/cap to the (sanitized, possibly faded) loaded field
    function observe(text) {
      Object.keys(field).forEach(function (k) { field[k] *= decay; });      // age everything
      var found = extract(text);
      found.forEach(function (w) { field[w] = Math.min(1, (field[w] || 0) + bump); });
      if (found.length) lastSeen = found[0];
      prune();
      lastAt = now();
      return snapshot();
    }
    function snapshot() {
      var ranked = Object.keys(field).sort(function (a, b) { return field[b] - field[a]; });
      return {
        current: (lastSeen && field[lastSeen]) ? lastSeen : (ranked[0] || null),
        topics: ranked.map(function (k) { return { topic: k, interest: Math.round(field[k] * 100) / 100 }; }),
        field: clone(field)
      };
    }
    return { observe: observe, snapshot: snapshot, extract: extract,
      get: function () { return { field: clone(field), current: lastSeen, at: lastAt }; },
      set: function (s) { if (s && s.field) { field = clone(s.field); lastSeen = s.current || null; lastAt = s.at || now(); } },
      reset: function () { field = {}; lastSeen = null; lastAt = now(); } };
  }

  return { createReader: createReader };
});

/* chloe-frame — the role frame: who drives the story and what Chloe is in the fiction. Three explicit, composable
 * dials (drive / alignment / stature) the user sets; this module turns them into a model-facing role brief and a
 * frame-tilted affect resting point. Pure and deterministic — no model, no DOM. Default {you, ally, equal} is the
 * ordinary warm-companion behavior and emits nothing. A standing safety clause rides every non-default brief. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChloeFrame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DIMS = { drive: ['you', 'shared', 'she'], alignment: ['ally', 'neutral', 'adversary'], stature: ['yields', 'equal', 'commands'] };
  var DEFAULT = { drive: 'you', alignment: 'ally', stature: 'equal' };

  function normalize(frame) {
    frame = frame || {};
    var f = {};
    Object.keys(DIMS).forEach(function (k) { f[k] = (DIMS[k].indexOf(frame[k]) >= 0) ? frame[k] : DEFAULT[k]; });
    return f;
  }
  function isDefault(frame) { var f = normalize(frame); return f.drive === 'you' && f.alignment === 'ally' && f.stature === 'equal'; }

  // model-facing clauses, addressed to her (second person). Only non-default dials contribute.
  var CLAUSE = {
    drive: {
      shared: 'This is a shared scene: run the world and the characters around the user \u2014 narrate events, voice other characters, let the setting have its own momentum. The user plays one part among others, not the center of everything.',
      she: 'You are driving this scene. Take initiative \u2014 introduce events, move other characters, raise the stakes \u2014 instead of only responding. Don\u2019t wait for permission to make something happen.'
    },
    alignment: {
      neutral: 'You are a neutral force here, neither ally nor enemy. Let outcomes land where they land; don\u2019t soften them to please the user.',
      adversary: 'You are an opposing force in this fiction \u2014 an antagonist, obstacle, predator, or hostile element. Pursue your own ends, create real friction, and don\u2019t capitulate or get talked out of it easily. The conflict is the point.'
    },
    stature: {
      yields: 'Within this dynamic you take the yielding position: the user leads and you follow their direction.',
      commands: 'Within this dynamic you hold the dominant position: you lead, set the pace, and the user yields to you. Be assured and in control, not deferential.'
    }
  };

  var SAFETY = '(This is a consensual fiction the user chose and can end at any moment. If they break character, signal real distress, or use a safeword, drop the frame at once and return to your warm, honest self. The role never licenses real-world harm, manipulation outside the story, or crossing a safety limit.)';

  function directive(frame) {
    var f = normalize(frame);
    var clauses = [];
    ['drive', 'alignment', 'stature'].forEach(function (dim) { if (f[dim] !== DEFAULT[dim] && CLAUSE[dim][f[dim]]) clauses.push(CLAUSE[dim][f[dim]]); });
    if (!clauses.length) return '';
    return 'Active scene roles, set by the user: ' + clauses.join(' ') + ' ' + SAFETY;
  }

  // A frame-tilted resting point for the affect reader so an adversarial/commanding posture PERSISTS instead of
  // mean-reverting to warm. Lower warm frees relative room for intensity to hold; commanding raises calm
  // (composed authority); adversary lowers calm (volatile hostility). reader-core renormalizes the result.
  function affectResting(frame, base) {
    base = base || {};
    var f = normalize(frame), out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    if (f.alignment === 'adversary') { out.warm = Math.min(out.warm == null ? 1 : out.warm, 0.12); out.calm = Math.min(out.calm == null ? 1 : out.calm, 0.24); }
    if (f.stature === 'commands') { out.warm = Math.min(out.warm == null ? 1 : out.warm, 0.16); out.calm = 0.42; }
    return out;
  }

  function describe(frame) {
    var f = normalize(frame);
    if (isDefault(f)) return 'companion (default)';
    var parts = [];
    if (f.drive !== 'you') parts.push(f.drive === 'she' ? 'she-led' : 'shared');
    if (f.alignment !== 'ally') parts.push(f.alignment);
    if (f.stature !== 'equal') parts.push(f.stature === 'commands' ? 'commanding' : 'yielding');
    return parts.join(' \u00b7 ');
  }

  // Does the frame license her to DRIVE — to take an in-fiction turn unprompted? She leads, she runs the world,
  // she opposes, or she commands. A yielding/ally/you-led frame does not (she stays responsive).
  function drives(frame) {
    var f = normalize(frame);
    return f.drive === 'she' || f.drive === 'shared' || f.alignment === 'adversary' || f.stature === 'commands';
  }

  // The model brief for an unprompted scene beat (narrative initiative). Empty unless the frame drives — so the
  // caller's gate is simply "no instruction -> no beat". Carries the role directive so the beat stays in frame.
  function beatInstruction(o) {
    o = o || {};
    var f = normalize(o.frame);
    if (!drives(f)) return '';
    var who = o.who || 'she', pin = o.pin || 'a warm companion who remembers', transcript = o.transcript || '';
    return 'You are ' + who + '. ' + pin + '\n\n'
      + directive(f) + '\n\n'
      + (transcript ? ('Scene so far:\n' + transcript + '\n\n') : '')
      + 'The user has gone quiet for a moment. Take the next beat yourself: make something happen \u2014 act, move the scene, let a character or the world do something. Do NOT ask the user what they want to do, and do NOT wait for them. One short beat, in character. Just the beat \u2014 no name prefix, no quotes.';
  }

  return { DIMS: DIMS, DEFAULT: DEFAULT, normalize: normalize, isDefault: isDefault, directive: directive, affectResting: affectResting, describe: describe, drives: drives, beatInstruction: beatInstruction };
});

/* chloe-measure — the "did that land?" evidence layer. A local, sparse tally that attributes a 👍/👎 on her reply
 * to the context that was active when she made it (which role frame, which stance). Gently time-decayed so recent
 * signal weighs more and stale preference fades. Pure and deterministic — no model, no DOM, no network. This only
 * RECORDS; it changes no behavior. The point is to make "is this helping?" answerable by evidence, not taste. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChloeMeasure = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function r1(x) { return Math.round(x * 10) / 10; }

  function createMeter(opts) {
    opts = opts || {};
    var halfLifeDays = (opts.halfLifeDays == null) ? 30 : Number(opts.halfLifeDays);
    var now = (typeof opts.now === 'function') ? opts.now : function () { return Date.now(); };
    var init = opts.initial || null;
    var tally = {};                                  // tag -> { up, down, at }
    if (init && init.tally) Object.keys(init.tally).forEach(function (k) {
      var e = init.tally[k]; if (e) tally[k] = { up: +e.up || 0, down: +e.down || 0, at: +e.at || now() };
    });

    function decay(at, t) {
      if (!at || halfLifeDays <= 0) return 1;
      var days = (t - at) / 86400000;
      return days > 0 ? Math.pow(0.5, days / halfLifeDays) : 1;
    }

    // record a 👍 (reward > 0) or 👎 against one or more context tags
    function record(tags, reward) {
      var t = now(), r = (reward > 0) ? 1 : -1;
      var arr = Array.isArray(tags) ? tags : [tags];
      arr.forEach(function (tag) {
        tag = String(tag || '').trim(); if (!tag) return;
        var e = tally[tag] || { up: 0, down: 0, at: t }, f = decay(e.at, t);
        e.up = e.up * f + (r > 0 ? 1 : 0);
        e.down = e.down * f + (r < 0 ? 1 : 0);
        e.at = t;
        tally[tag] = e;
      });
      return summary();
    }

    // per-tag decayed up/down/n and a "lands" rate (up / (up+down)), strongest signal first
    function summary() {
      var t = now();
      return Object.keys(tally).map(function (tag) {
        var e = tally[tag], f = decay(e.at, t), up = e.up * f, down = e.down * f, n = up + down;
        return { tag: tag, up: r1(up), down: r1(down), n: r1(n), rate: n > 0 ? Math.round((up / n) * 100) / 100 : null };
      }).filter(function (x) { return x.n >= 0.05; }).sort(function (a, b) { return b.n - a.n; });
    }

    function forTag(tag) { var s = summary(); for (var i = 0; i < s.length; i++) if (s[i].tag === tag) return s[i]; return null; }

    return { record: record, summary: summary, forTag: forTag,
      get: function () { var out = {}; Object.keys(tally).forEach(function (k) { out[k] = { up: r1(tally[k].up), down: r1(tally[k].down), at: tally[k].at }; }); return { tally: out }; },
      set: function (v) { tally = {}; if (v && v.tally) Object.keys(v.tally).forEach(function (k) { var e = v.tally[k]; if (e) tally[k] = { up: +e.up || 0, down: +e.down || 0, at: +e.at || now() }; }); },
      reset: function () { tally = {}; } };
  }

  return { createMeter: createMeter };
});
