# checkpointer
Readme under contruction.

#### checkpointer(required, callback)
#### checkpointer.onceLoaded(required, callback)
Fires callback after all modules specified in required table are loaded and all conditions fulfilled.
```javascript
checkpointer([
  'jQuery', 
  function() {return !!document.getElementById('painting');}
], function($) {
  $('#painting').css('border', '10px solid black');
});

setTimeout(function() {
  $('<div id="painting">asddas</div>').appendTo('body');
}, 1500);
```

#### checkpointer.setModuleOnce(name, required, module, options)
Creates module *name* from value returned by module function.
```javascript
checkpointer.setModuleOnce('switcher', ['jQuery'], function($) {
  var switcher = {
    'elem' : $('<div>switcher</div>'),
    'turnOn' : function() { $(this.elem).css('opacity', 1.0); },
    'turnOff' : function() { $(this.elem).css('opacity', 0.2); }
  };
  switcher.elem.appendTo('body');
  return switcher;
});

checkpointer.setModuleOnce('jQuery', [], function() {
  return window.jQuery;
});

checkpointer.onceLoaded(['switcher'], function(sw) {
  sw.turnOff();
});
```


#### Dev. notes:
Reconsider using setTimeout(0) or wrapping callbacks and modules contructors in try-catch.
