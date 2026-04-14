const measure = (() => {
  function enable()  { console.log('measure enabled');  }
  function disable() { console.log('measure disabled'); }
  return { enable, disable };
})();
