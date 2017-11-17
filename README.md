# PiPort

###### Reactive programming made easy



## Installation 

```bash
npm i piport 
```

## Quick Start 

```javascript
const {ValuePort} = require('piport');

class PassiveSender {
  constructor() {
    // create a port for sender out values passively (no known receiver)
    this.value$ = new ValuePort().next(0);
  }

  increment() {
    let n = 0;
    // connect to value port, get the value and immediately disconnect
    this.value$.connect(i => n = i + 1)();
    // send new value
    this.value$.next(n);
  }
}

class ActiveReceiver {
  constructor(foo) {
    // actively receive value from foo and transform the value by x2
    this.bar$ = foo.value$.build(src => src.map(x => 2 * x));
    // listen to the value, and immediately receive the current one
    this.bar$.connect(v => {
      console.log('bar receive', v);
    })
  }
}

// create instances
let sender = new PassiveSender();
let receiver = new ActiveReceiver(sender);

// sender perform some actions, and receiver receive value automatically
sender.increment();
sender.increment();
sender.increment();

/*
output:
bar receive 0
bar receive 2
bar receive 4
bar receive 6
 */


```

 
