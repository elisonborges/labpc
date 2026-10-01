/* LabPC Portable — API offline sem servidor */
(function(){
  const listeners=[];
  window.LabPC={
    connect:function(){},
    on:function(fn){ if(typeof fn==='function') listeners.push(fn); },
    event:function(){},
    presence:function(){},
    send:function(){},
    identify:function(){},
    isPortable:true
  };
})();