var memtestUI = {
    ui : { /* references to document elements go here. */ },

    init: function() {
        this.ui.screen      = document.getElementById('screen');
        this.ui.appname     = document.getElementById('appname');
        this.ui.appvers     = document.getElementById('appvers');
        this.ui.passStatus  = document.getElementById('passstatus');
        this.ui.testStatus  = document.getElementById('teststatus');
        this.ui.segmentInfo = document.getElementById('segmentinfo');
        this.ui.testName    = document.getElementById('testname');
        this.ui.testPattern = document.getElementById('testpattern');

        this.ui.osinfo      = document.getElementById('osinfo');
        this.ui.cpuinfo     = document.getElementById('cpuinfo');
        this.ui.raminfo     = document.getElementById('raminfo');
        this.ui.info1       = document.getElementById('info1');
        this.ui.info2       = document.getElementById('info2');

        this.ui.passnum      = document.getElementById('passnum');
        this.ui.walltime     = document.getElementById('walltime');
        this.ui.lastpasstime = document.getElementById('lastpasstime');
        this.ui.memspeed     = document.getElementById('memspeed');
        this.ui.numerrors    = document.getElementById('numerrors');

        this.ui.errors       = document.getElementById('errors');

        this.ui.info1.textContent = this.makeChars(28, " ");
        this.ui.info2.textContent = this.makeChars(28, " ");

        /* Setup initial content */
        this.setVersion("0.01");
        this.setOSInfo();
        this.setCPUInfo();
        this.setRAMInfo();
        this.setPassStatus(0);
        this.setTestStatus(0);
        this.setSegmentInfo(-1);
        this.setTestName("waiting to begin…", 0);
        this.setTestPattern(0);
        this.setRuntime();
        this.setLastPassTime();
        this.setMemorySpeed(0);
        this.setPassNum(0);
    },

    makeChars: function(i, c) {
        var chars = "";
        while(i > 0 && i--)
            chars += c;
        return chars;
    },

    setOSInfo: function(os) {
        os = os || navigator.oscpu || navigator.platform;
        var len = 28;
        len -= 5;
        len -= os.length;
        this.ui.osinfo.textContent = " OS: " + os + this.makeChars(len, " "); // xxx truncate
    },

    setCPUInfo: function(cpu) {
        cpu = cpu || "unknown"; // content can't do this.
        var len = 28;
        len -= 5; // "CPU: "
        len -= cpu.length;
        this.ui.cpuinfo.textContent = "CPU: " + cpu + this.makeChars(len, " ");
    },
    setRAMInfo: function(ram) {
        ram = ram || "unknown"; // content can't do this.
        var len = 28;
        len -= 5; // "RAM: "
        len -= ram.length;
        this.ui.raminfo.textContent = "RAM: " + ram + this.makeChars(len, " ");
    },
    setVersion: function(version) {
      var len = 28;
      len -= 1; // hack, the red "+" is hardcoded.

      var appname = "MemtestJS";
      version = " v" + version;

      var padding = (len - (appname.length + version.length)) / 2;
      var paddingLeft = Math.floor(padding);
      var paddingRight = Math.ceil(padding);

      this.ui.appname.textContent = this.makeChars(paddingLeft, " ") + appname;
      this.ui.appvers.textContent = version + this.makeChars(paddingRight, " ");
    },

    setPassStatus: function(percent) {
        var text = " Pass " + Math.floor(100 * percent) + "% ";
        if (percent < 0.10)
            text += " ";
        text += this.makeChars(Math.floor(39 * percent), "#");
        this.ui.passStatus.textContent = text;
    },

    setTestStatus: function(percent) {
        var text = " Test " + Math.floor(100 * percent) + "% ";
        if (percent < 0.10)
            text += " ";
        text += this.makeChars(Math.floor(39 * percent), "#");
        this.ui.testStatus.textContent = text;
    },

    setTestName: function(name) {
        var text = " Test ";
        if (MemtestRunner.isRunning) {
            var testnum = MemtestRunner.currentTestNum + 1;
            text += "#" + testnum;
            if (testnum < 10)
                text += " ";
        } else {
            text += "   ";
        }
        text += " [" + name + "]";
        // XXX truncate if > x chars?
        this.ui.testName.textContent = text;
    },

    setSegmentInfo: function(num, max, size) {
        // Original memtest format: Testing: 4096M - 9999M 1234M
        var text = " Testing: "
        if (num >= 0) {
            size = size / 1048576; // change to MB
            var begin = size * num;
            var end = size * (num + 1);
            var total = max * size;
            text += begin + "MB - " + end + "MB of " + total + "MB";
        }
        this.ui.segmentInfo.textContent = text;
    },

    setTestPattern: function(pattern) {
        var text = " Pattern:   ";
        var pat = pattern.toString(16);
        text += this.makeChars(8 - pat.length, "0") + pat;
        this.ui.testPattern.textContent = text;
    },

    setPassNum : function(num_passes) {
        var text = num_passes.toString();
        text = this.makeChars(6 - text.length, " ") + text;
        this.ui.passnum.textContent = text;
    },

    makeTimeString : function(duration) {
        var secs = duration % 60;
        if (secs < 10)
            secs = "0" + secs;
        var mins = Math.floor(duration / 60) % 60;
        if (mins < 10)
            mins = "0" + mins;
        var hours = Math.floor(duration / 3600);
        return hours + ":" + mins + ":" + secs;
    },

    setRuntime : function() {
        var text = "";
        if (runtime_start) {
            var seconds = Math.floor((Date.now() - runtime_start) / 1000);
            text = this.makeTimeString(seconds);
        }
        this.ui.walltime.textContent = this.makeChars(9 - text.length, " ") + text;
    },

    setLastPassTime : function() {
        var text = "";
        if (pass_start) {
            var seconds = Math.floor((Date.now() - pass_start) / 1000);
            text = this.makeTimeString(seconds);
        }
        this.ui.lastpasstime.textContent = this.makeChars(8 - text.length, " ") + text;
    },

    setMemorySpeed : function(blocks, start, stop) {
        var text;
        if (blocks) {
            var secs  = (stop - start) / 1000;
            var bytes = blocks * block_size / 1048576;
            var mbs = Math.round(bytes/secs);
            text = mbs + " MB/s";
        } else {
            text = "";
        }
        text = this.makeChars(9 - text.length, " ") + text;
        this.ui.memspeed.textContent = text;
    },

    setNumErrors : function(num_errors) {
        var text = num_errors.toString();
        text = this.makeChars(6 - text.length, " ") + text;
        this.ui.numerrors.textContent = text;
        if (num_errors)
            this.ui.numerrors.setAttribute("fail", true);
        else
            this.ui.numerrors.removeAttribute("fail");
    },

    reportBadMemory: function(seg, index, goodVal, badVal) {
        // Track this state outside of UI code?
        num_errors++;
        this.setNumErrors(num_errors);

        var hex, text = " ";

        var newErr = document.createElement("span");
        newErr.className = "badmem";

        var testnum = MemtestRunner.currentTestNum + 1;
        if (testnum < 10)
            text += " ";
        text += testnum

        text += "    ";
        if (num_passes < 10)
            text += " ";
        text += num_passes;

        text += "  ";
        var addr = "seg " + seg + ", offset " + index;
        addr += this.makeChars(23 - addr.length, " ");
        text += addr; // orig "000ac921e28 -  2761.1MB";

        text += "  ";
        hex = goodVal.toString(16);
        text += this.makeChars(8 - hex.length, "0") + hex;

        text += "  ";
        hex = badVal.toString(16);
        text += this.makeChars(8 - hex.length, "0") + hex;

        text += "  ";
        var badBits = (goodVal ^ badVal);
        hex = badBits.toString(16);
        text += this.makeChars(8 - hex.length, "0") + hex;

        // temp
        text += "  ";
        var errs = num_errors.toString();
        text += this.makeChars(5 - errs.length, " ") + errs;
        text += "     ";

        text += "\n";
        newErr.textContent = text;
        this.ui.errors.appendChild(newErr);
    },

    makeFinalReport: function() {
        var report = "";
        report += "Errors: " + num_errors + "\n";
        if (num_errors) {
            report += "Tst  Pass   Failing Address          Good       Bad     Err-Bits  Err #\n";
            report += "---  ----  -----------------------  --------  --------  --------  -----\n";
            report += this.ui.errors.textContent;
        }
        return report;
    },
};
