/*
 * memtestJS
 */

// Big google study
// http://www.cs.toronto.edu/~bianca/papers/sigmetrics09.pdf
// Interesting background
// http://www.pld.ttu.ee/IAF0030/curtis.pdf
// Some general approach
// http://www.ganssle.com/testingram.htm
// http://digitalelectronics.blogspot.com/2009/01/memories-test-patterns-algorithms-part_12.html
// http://www.memtest86.com/technical.htm

// Hmm, phys->real->virt may be pretty complicated?
// http://en.wikipedia.org/wiki/Memory_geometry



// XXX MISC NOTES
// * JS loop giving me ~128MB/sec, memtest86 = 3650MB/s --> 29x slower
// * do feature detection if this is in the web?
// * will need to allocate (and touch?) random preblocks to
//   help ensure we're not touching the same physical bits
//   all the time.
// * is asm.js of interest to these tests? (speed)
// * spawn multiple workers -- faster on multicpu systems (or
//   is it already mem bandwidth limited?) and to test multicore
//   interactions?
// * what happens with bad ECC? Does the OS notice corrections?
// * does parity-checking memory exist anymore?
// * listen for low-memory-pressure and abort? (avoid suicide, though)


// fault types http://www.ece.uc.edu/~wjone/Memory.pdf
// bits stuck at 0 or 1
// bits that fail to transition (0->1 or 1->0)
// bits that affect neighboring bits (physically)
// ...setting A sets B
// ...pattern in nearby bits sets a bit
// ...pattern in nearby bits *disables* a bit (unsettable)
// order might matter? (0x0000 -> 0xffff then back)
// addressing glitches -- simple pattern fills won't detect
// speed of execution -- want to drive address/data line chanes fast,
//   so slow testing might not trigger flaws

var num_passes, max_passes, num_errors, block_size;
var pass_start = 0, runtime_start = 0, runtime_interval;


MemtestRunner = {
  isRunning: false,
  currentTestNum: -1,

  tests: [
          "memtest_1fill",
          "memtest_0fill",
          "memtest_double1fill",
          "memtest_double0fill",
          "memtest_uniqueFill",
          "memtest_inversions",
          "memtest_inversions32",
         ],

  start: function(num_blocks, prealloc_blocks) {
    this.isRunning = true;
    this.currentTestNum = -1;

    num_passes = 1;
    memtestUI.setPassNum(num_passes);

    num_errors = 0;
    memtestUI.setNumErrors(num_errors);

    runtime_start = Date.now();
    memtestUI.setRuntime();

    runtime_interval = setInterval("memtestUI.setRuntime()", 1000);
    memWorker.postMessage({ command: "init", block_size: block_size, num_blocks: num_blocks, prealloc_blocks: prealloc_blocks});
  },

  stop: function() {
    // XXX actuall post message to stop
    // XXX should actuall only update UI upon stop ACK
    memWorker.terminate();
    this.isRunning = false;
  },

  doNextTest: function() {
    this.currentTestNum++;

    if (this.currentTestNum == 0) {
      pass_start = Date.now();
    } else if (this.currentTestNum >= this.tests.length) {
      this.finishPass();
      return;
    }

    memtestUI.setPassStatus(this.currentTestNum / this.tests.length);
    memWorker.postMessage({ command: this.tests[this.currentTestNum] });
  },

  finishPass: function() {
    //console.log("Finished pass " + num_passes + " of " + max_passes);
    memtestUI.setPassStatus(1); // ensure 100%
    memtestUI.setLastPassTime();
    num_passes++;
    if (max_passes == 0 || num_passes <= max_passes) {
        memtestUI.setPassNum(num_passes);
        this.currentTestNum = -1;
        this.doNextTest();
    } else {
        console.log("All passes finished, shutting down.");
        clearInterval(runtime_interval);
        runtime_interval = 0;
        this.isRunning = false;
        memWorker.postMessage({ command: "uninit" });

        if (LOGGER_HACK) {
          // XXX for testing -- see https://github.com/dolske/weblogger
          var report = "weblogger:" + memtestUI.makeFinalReport();
          report = report.replace(/\n/g, "\r\n");
          window.postMessage(report, "*");
          memtestUI.ui.errors.innerHTML = ""; // Only report stuff once.

          // Loop forever, w/ delay, to give GC plenty of time.
          setTimeout(startstop, 45000);
        }
    }
  },

};

function onWorkerMessage(event) {
    var msg = event.data;
    //console.log(msg.command);
    if (msg.ui)
        memtestUI[msg.command](msg.arg1, msg.arg2, msg.arg3, msg.arg4, msg.arg5);
    else if (msg.command == "testFinished")
        MemtestRunner.doNextTest();
    else if (msg.command == "workerShutdown")
        console.log("Worker has shut down.");
    else
        console.log("WorkerLog: " + msg);
}

function onWorkerError(m) {
    console.log("WorkerERROR: " + m.message + " @line " + m.lineno);
}

// Note: Chrome won't allow loading a file:// worker; throws with a scary
// "Uncaught SecurityError: An attempt was made to break though the security
// policy of the user agent" error. Running memtest from a web server works.
var memWorker = new Worker("memtest-worker.js");
memWorker.onmessage = onWorkerMessage;
memWorker.onerror   = onWorkerError;

