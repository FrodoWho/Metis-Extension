const guides = (() => {
  function enable()  { console.log('guides enabled');  }
  function disable() { console.log('guides disabled'); }
  return { enable, disable };
})();
