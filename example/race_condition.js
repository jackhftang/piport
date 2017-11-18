const {ValuePort} = require('../index');

let port$ = new ValuePort().next(1);

// todo: is it possible to make close$ defined later than out$ ??
let close$ = port$.pipe(p => p.constant(false));
let out$ = port$.pipe(pipe => pipe
  .block(close$, true)
);

out$.connect(v => console.log(v));
