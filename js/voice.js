// ═══ Voice Recognition wrapper – English + Tamil ═══
const Voice = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return { supported: false };

  let rec = null;
  let onResult = null;
  let onEnd = null;
  let lang = 'en-US';

  function create(language) {
    if (rec) { try { rec.abort(); } catch(_){} }
    rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.lang            = language || lang;

    rec.onresult = e => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final  += e.results[i][0].transcript;
        else                       interim += e.results[i][0].transcript;
      }
      if (onResult) onResult({ final, interim });
    };
    rec.onend = () => { if (onEnd) onEnd(); };
    rec.onerror = e => { console.warn('Voice error', e.error); if (onEnd) onEnd(); };
    return rec;
  }

  return {
    supported: true,
    start(opts = {}) {
      onResult = opts.onResult || null;
      onEnd    = opts.onEnd    || null;
      lang     = opts.lang     || 'en-US';
      create(lang).start();
    },
    stop() { try { rec && rec.stop(); } catch(_){} },
    abort(){ try { rec && rec.abort(); } catch(_){} },
  };
})();
