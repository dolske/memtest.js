// memtest worker thread

// Can't use |var onmessage| or |function onmessage()|!
onmessage = function(e) {
    var data = e.data;
    //dump("WORKER MESSAGE: " + data + "\n");
    var command = data.command;
    switch (command) {
        case "init":
            init(e.data.block_size, e.data.num_blocks);
            postMessage({command:"testFinished"});
            break;
        case "uninit":
            ui("setTestStatus", 0);
            ui("setTestPattern", 0);
            ui("setTestName", "tests complete", 0);
            ui("setSegmentInfo", -1);
            memory_segments = [];
            postMessage({command:"workerShutdown"});
            break;

        case "memtest_1fill":
            memtest_1fill();
            postMessage({command:"testFinished"});
            break;
         case "memtest_0fill":
            memtest_0fill();
            postMessage({command:"testFinished"});
            break;
        case "memtest_double1fill":
            memtest_double1fill();
            postMessage({command:"testFinished"});
            break;
        case "memtest_double0fill":
            memtest_double0fill();
            postMessage({command:"testFinished"});
            break;
        case "memtest_uniqueFill":
            do_uniqueFill();
            postMessage({command:"testFinished"});
            break;
        case "memtest_inversions":
            memtest_inversions();
            postMessage({command:"testFinished"});
            break;
        case "memtest_inversions32":
            memtest_inversions32();
            postMessage({command:"testFinished"});
            break;
        default:
            throw "Unknown worker command: " + command;
    }

}

var memory_segments = [], pattern;

function log(str) {
    postMessage(str);
}

function ui(command, arg1, arg2, arg3, arg4, arg5) {
    postMessage({ui: true, command:command,
                 arg1:arg1, arg2:arg2, arg3:arg3, arg4:arg4, arg5:arg5 });
}

function init(segment_size, num_segments) {
    for (var i = 0; i < num_segments; i++) {
      // Allocate a chunk of memory
      var blob = new ArrayBuffer(segment_size);
      memory_segments[i] = new Uint32Array(blob);
    }
    log("Worker allocated " + num_segments + " segments of " + segment_size + " bytes.");
}



/*
 * Exercise each 1-bit. Sequentially fill all memory with:
 *   0b0000...0001
 *   0b0000...0010
 *   0b0000...0100
 *   ...
 *   0b1000...0000
 */
function memtest_1fill() {
    ui("setTestName", "1-bit pattern fill");
    var num_segments = memory_segments.length;
    for (var m = 0; m < num_segments; m++) {
        var mem = memory_segments[m];
        ui("setSegmentInfo", m, num_segments, mem.length * 4);
        pattern = 0x00000001;
        var start = Date.now();
        for (var i = 0; i < 32; i++) {
            ui("setTestPattern", pattern);
            ui("setTestStatus", (32 * m + i) / (32 * num_segments));
            do_simpleFill(m, mem, pattern);
            pattern = (pattern << 1) >>> 0;
        }
        var stop = Date.now();
        ui("setMemorySpeed", 64, start, stop);
    }
}



/*
 * Exercise each 0-bit. Sequentially fill all memory with:
 *   0b1111...1110
 *   0b1111...1101
 *   0b1111...1011
 *   ...
 *   0x0111...1111
 */
function memtest_0fill() {
    ui("setTestName", "0-bit pattern fill");
    var num_segments = memory_segments.length;
    for (var m = 0; m < num_segments; m++) {
        var mem = memory_segments[m];
        ui("setSegmentInfo", m, num_segments, mem.length * 4);
        pattern = 0x00000001;
        var start = Date.now();
        for (var i = 0; i < 32; i++) {
            var invert = ~pattern >>> 0;
            ui("setTestPattern", invert);
            ui("setTestStatus", (32 * m + i) / (32 * num_segments));
            do_simpleFill(m, mem, invert);
            pattern = (pattern << 1) >>> 0;
        }
        var stop = Date.now();
        ui("setMemorySpeed", 64, start, stop);
    }
}



/*
 * Exercise double 1-bits. Sequentially fill all memory with:
 *   0b0000...0011
 *   0b0000...0110
 *   0b0000...1100
 *   ...
 *   0b1100...0000
 */
function memtest_double1fill() {
    ui("setTestName", "double 1-bit pattern fill");
    var num_segments = memory_segments.length;
    for (var m = 0; m < num_segments; m++) {
        var mem = memory_segments[m];
        ui("setSegmentInfo", m, num_segments, mem.length * 4);
        pattern = 0x00000011;
        var start = Date.now();
        for (var i = 0; i < 31; i++) {
            ui("setTestPattern", pattern);
            ui("setTestStatus", (31 * m + i) / (31 * num_segments));
            do_simpleFill(m, mem, pattern);
            pattern = (pattern << 1) >>> 0;
        }
        var stop = Date.now();
        ui("setMemorySpeed", 62, start, stop);
    }
}

/*
 * Exercise double 0-bits. Sequentially fill all memory with:
 *   0b1111...1100
 *   0b1111...1001
 *   0b1111...0011
 *   ...
 *   0b0011...1111
 */
function memtest_double0fill() {
    ui("setTestName", "double 0-bit pattern fill");
    var num_segments = memory_segments.length;
    for (var m = 0; m < num_segments; m++) {
        var mem = memory_segments[m];
        ui("setSegmentInfo", m, num_segments, mem.length * 4);
        pattern = 0x00000011;
        var start = Date.now();
        for (var i = 0; i < 31; i++) {
            var invert = ~pattern >>> 0;
            ui("setTestPattern", invert);
            ui("setTestStatus", (31 * m + i) / (31 * num_segments));
            do_simpleFill(m, mem, invert);
            pattern = (pattern << 1) >>> 0;
        }
        var stop = Date.now();
        ui("setMemorySpeed", 62, start, stop);
    }
}

/*
 * XXX test ideas...
 *
 * Exercise alternating bits. Sequentially fill all memory with:
 *   0b1010...1010
 *   0b0101...0101
 */



/*
 * Exercise flipping bits. This repeats 8 times, once for each bit in a byte.
 *
 * First initialize memory with the base pattern:
 *   0b00000001...00000001
 * ...then fill with the inverse to flip the bits...
 *   0b11111110...11111110
 * ...then fill with the base pattern again to flip the other way...
 *   0b00000001...00000001
 * ...again, but from top-of-memory to bottom...
 *   0b11111110...11111110
 * ...again, but from top-of-memory to bottom...
 *   0b00000001...00000001
 *
 * XXX Why bottom-to-top + top-to-bottom? Address lines?
 *     Could make faster by testing multiple bits at a time.
 *
 * This is memtest86 test 3.
 *  main does:
 *    p1 = 80808080
 *    p2 = ~p1
 *    movinv1(p1,p2)
 *    movinv1(p2,p1)
 *    loop above 8 times, rightshift p1.
 *  movinv1 does:
 *    fill segment (forward) with p1
 *    verify p1 (forward)
 *    along the way fill with p2
 *    verify p2 (backwards)
 *    along the way fill with p1
 */
function memtest_inversions() {
    ui("setTestName", "moving inversions");
    var num_segments = memory_segments.length;
    for (var m = 0; m < num_segments; m++) {
        var mem = memory_segments[m];
        ui("setSegmentInfo", m, num_segments, mem.length * 4);
        var pattern1 = 0x80808080;
        var pattern2 = ~pattern1 >>> 0; // shift-0 to keep as uint
        var start = Date.now();
        for (var i = 0; i < 8; i++) {
            //log("p1 = 0x" + pattern1.toString(16) + "  p2 = 0x" + pattern2.toString(16));
            ui("setTestStatus", (8 * m + i) / (8 * num_segments));
            ui("setTestPattern", pattern1);
            do_simpleFill(m, mem, pattern1, false); // p1-over-X, forwards (X == last pattern)
            ui("setTestPattern", pattern2);
            do_simpleFill(m, mem, pattern2, false); // p2-over-p1, forward
            ui("setTestPattern", pattern1);
            do_simpleFill(m, mem, pattern1, false); // p1-over-p2, forward
            ui("setTestPattern", pattern2);
            do_simpleFill(m, mem, pattern2, true);  // p2-over-p1, reverse
            ui("setTestPattern", pattern1);
            do_simpleFill(m, mem, pattern1, true);  // p1-over-p2, reverse
            pattern1 = pattern1 >>> 1;
            pattern2 = ~pattern1 >>> 0; // shift-0 to keep as uint
        }
        var stop = Date.now();
        ui("setMemorySpeed", 8 * 5 * 2, start, stop);
    }
}


/*
 * Exercise flipping bits. Similar to memtest_inversions(), but the pattern
 * used is left-shifted by 1 bit each 32-bit word. For example, the initial
 * fill is:
 *
 * 0000: 0b0000...00000001
 * 0004: 0b0000...00000010
 * 0008: 0b0000...00000100
 *
 * The test repeats 4x, with the starting pattern left-shifted 8-bits each
 * time. The original memtest86 code shifted 1-bit per repeat (to ensure each
 * bit is exercised).
 * XXX should make this 32x, or do 8x with 0x01010101 + 1 shift/pass.
 *                                   maybe 0x08040201
 *
 * This is memtest86 test 6.
 * main does:
 *   p1 = 0x00000001
 *   movinv32( p1, 0x00000001, 0x80000000,    0,   i)
 *   movinv32(~p1, 0xfffffffe, 0x7fffffff,    1,   i)
 *            pat,         lb,         hb, sval, off
 *   loop above 32 times (i), leftshift p1.
 *
 * movinv32 args:
 *   k = 0
 *   fill1: (what is this "CDH")
 *     set word to pat
 *     if (++k overflow) --> pat = lb, k = 0
 *     else pat << 1, pat |= sval
 *
 *   check1+fill2:
 *     check if word == pat
 *     set word to !pat
 *     if (++k overflow) --> pat = lb, k = 0
 *     else pat << 1, pat |= sval
 *
 *   ... reset ("Since we already adjusted k ...") ...
 *
 *   check2+fill3: (reverse)
 *    *   check if word == ~pat
 *     set word to pat
 *     if (--k overflow) --> pat = hb, k = 32
 *     else pat >> 1, pat |= p3   (p3 == sval << 31)
 *
 */
function memtest_inversions32() {

    ui("setTestName", "moving inversions (pattern shift)");
    var num_segments = memory_segments.length;
    for (var m = 0; m < num_segments; m++) {
        var mem = memory_segments[m];
        ui("setSegmentInfo", m, num_segments, mem.length * 4);
        var pattern1 = 0x00000001;
        var pattern2 = ~pattern1 >>> 0; // shift-0 to keep as uint
        var start = Date.now();
        for (var i = 0; i < 4; i++) {
            // log("SHIFTMAIN p1 = 0x" + pattern1.toString(16) + "  p2 = 0x" + pattern2.toString(16));
            ui("setTestStatus", (4 * m + i) / (4 * num_segments));
            ui("setTestPattern", pattern1);
            do_shiftFill(m, mem, pattern1, false); // 1-over-X, forwards (X == last pattern)
            ui("setTestPattern", pattern2);
            do_shiftFill(m, mem, pattern2, false); // 2-over-1, forward
            ui("setTestPattern", pattern1);
            do_shiftFill(m, mem, pattern1, false); // 1-over-2, forward
            ui("setTestPattern", pattern2);
            do_shiftFill(m, mem, pattern2, true);  // 2-over-1, reverse
            ui("setTestPattern", pattern1);
            do_shiftFill(m, mem, pattern1, true);  // 1-over-2, reverse
            pattern1 = (pattern1 << 8) >>> 0;
            pattern2 = ~pattern1 >>> 0; // shift-0 to keep as uint
        }
        var stop = Date.now();
        ui("setMemorySpeed", 4 * 5 * 2, start, stop);
    }
}



// XXX Ideally this would dump a physical address. Possible with OS help?
function markFailAt(seg, mem, i, pattern) {
    ui("reportBadMemory", seg, i, pattern, mem[i]);
}

/*
 * Touch enough of the memory to try and keep it all paged in.
 */
function touchMem(mem) {
    var PAGESIZE = 4096 / 4; // uint32s per page
    var len = mem.length;
    for (var i = 0; i < len; i+=PAGESIZE)
        mem[i] = 0; // could just read it, but don't want JS to optimize it away.
}

function do_simpleFill(seg, mem, pattern, reverse) {
    //console.log("Running simpleFill with pattern 0x" + pattern.toString(16));

    // Fill |mem| with the specified 32-bit pattern.
    var len = mem.length;
    if (reverse) {
        for (var i = len - 1; i >= 0; i--)
            mem[i] = pattern;
    } else {
        for (var i = 0; i < len; i++)
            mem[i] = pattern;
    }

    // Verify that contents are as expected. Reverse reads are probably not so useful, but meh.
    if (reverse) {
        for (var i = len - 1; i >= 0; i--)
            if (mem[i] !== pattern)
                markFailAt(seg, mem, i, pattern);
    } else {
        for (var i = 0; i < len; i++)
            if (mem[i] !== pattern)
                markFailAt(seg, mem, i, pattern);
    }
}

// See memtest_inversions32()
function do_shiftFill(seg, mem, pattern, reverse) {
    var isInverted = !!(pattern & 0xfe);
    var rightbit_fill = isInverted ? 0x01 : 0x00;
    var orig_pattern = pattern, bitsTillOverflow = 0;

    // The initial pattern is assumed to have 1 bit flipped differently.
    // Need to determine how many left-shifts it will take to clear it.
    var firstLoopTest = (isInverted ? ~pattern : pattern) >>> 0;
    while (firstLoopTest = firstLoopTest << 1) {
        //firstLoopTest = firstLoopTest << 1;
        bitsTillOverflow++;
    }
    //log("Running simpleFill with pattern 0x" + pattern.toString(16) + ", inv=" + isInverted + ", 1stb=" + bitsTillOverflow);

    // Fill |mem| with the specified 32-bit pattern.
    var len = mem.length;

    pattern = orig_pattern;
    if (reverse) {
        for (var i = len - 1; i >= 0; i--) {
            mem[i] = pattern;
            if (bitsTillOverflow--) {
                pattern = ((pattern << 1) | rightbit_fill) >>> 0;
            } else {
                bitsTillOverflow = 32;
                pattern = (isInverted ? 0xfffffffe : 0x00000001);
            }
        }
    } else {
        for (var i = 0; i < len; i++) {
            //log("filling [" + i + "] with " + pattern.toString(16))
            mem[i] = pattern;
            if (bitsTillOverflow--) {
                pattern = ((pattern << 1) | rightbit_fill) >>> 0;
            } else {
                bitsTillOverflow = 32;
                pattern = (isInverted ? 0xfffffffe : 0x00000001);
            }
        }
    }

    // Verify that contents are as expected. Reverse reads are probably not so useful, but meh.
    // ...OTOH, that might help avoid just reading back from cache initially.
    pattern = orig_pattern;
    bitsTillOverflow = 0;
    firstLoopTest = (isInverted ? ~pattern : pattern) >>> 0;
    while (firstLoopTest = firstLoopTest << 1) {
        //firstLoopTest = firstLoopTest << 1;
        bitsTillOverflow++;
    }
    if (reverse) {
        for (var i = len - 1; i >= 0; i--) {
            if (mem[i] !== pattern)
                markFailAt(seg, mem, i, pattern);
            if (bitsTillOverflow--) {
                pattern = ((pattern << 1) | rightbit_fill) >>> 0;
            } else {
                bitsTillOverflow = 32;
                pattern = (isInverted ? 0xfffffffe : 0x00000001);
            }
        }
    } else {
        for (var i = 0; i < len; i++) {
            //log("checking [" + i + "] with " + pattern.toString(16))
            if (mem[i] !== pattern)
                markFailAt(seg, mem, i, pattern);
            if (bitsTillOverflow--) {
                pattern = ((pattern << 1) | rightbit_fill) >>> 0;
            } else {
                bitsTillOverflow = 32;
                pattern = (isInverted ? 0xfffffffe : 0x00000001);
            }
        }
    }

}

/*
 *
 * Fill each 32-bit word in |mem| with a unique value. Goal is to test
 * if changing a bit at one address directly sets a bit at some other address.
 * "mem[i] = i" would do this in principle, but it would be better to mix up
 * the bits more so that the odds of any two bits (at different addresses) being
 * the same is 0.5. EG, for a simple counter, most of the bits at mem[i] and mem[i+1]
 * are identical. Let's instead use a fast PRNG, and do |mem[i] = f(i)|.
 */
function do_uniqueFill() {
    ui("setTestName", "unique value fill");
    ui("setTestPattern", 0);

    // hmm, http://burtleburtle.net/bob/rand/smallprng.html ?

    // http://burtleburtle.net/bob/hash/integer.html
    // That's simple, but probably incorrect for the trivial/simplistic JS port. Good 'nuff!
    // XXX fixme :-)
    function hash(a) {
        a = (a ^ 61) ^ (a >> 16);
        a = a + (a << 3);
        a = a ^ (a >> 4);
        a = a * 0x27d4eb2d;
        a = a ^ (a >> 15);
        return a;
    }

    var num_segments = memory_segments.length;
    for (var m = 0; m < num_segments; m++) {
        var start = Date.now();
        var mem = memory_segments[m];
        ui("setSegmentInfo", m, num_segments, mem.length * 4);
        ui("setTestStatus", m / num_segments);
        var len = mem.length;
        for (var i = 0; i < len; i++)
            mem[i] = hash(i);

        ui("setTestStatus", (m + 0.5) / num_segments);

        // fake badmem for testing
        //mem[42] |= 0x00000080;
        //mem[len - 42] |= 0x00020000;

        // Verify that contents are as expected.
        for (var i = 0; i < len; i++)
            if (mem[i] !== hash(i))
                markFailAt(m, mem, i, hash(i));
        var stop = Date.now();
        ui("setMemorySpeed", 2, start, stop);
    }
}


log("Worker loaded!");

// -------- memtest86 tests --------

// Displayed test names for memtest86+ v4.20)
//   #1 Address test, own address
//   #2 Moving inversions, ones & zeros
//   #3 Moving inversions, 8 bit pattern
//   #4 Moving inversions, random pattern
//   #5 Block move, 80 moves
//   #6 Moving inversions, 32 bit pattern
//   #7 Random number sequence
//   #8 Modulo 20, Random pattern




/*
 * Test 0 [Address test, walking ones, no cache]
 *  Tests all address bits in all memory banks by using a walking ones address pattern.
 *
 * Based on test.c :: addr_tst1()
 */

/*
 * Test 1 [Address test, own address, Sequential]
 * Each address is written with its own address and then is checked for consistency.
 * In theory previous tests should have caught any memory addressing problems. This
 * test should catch any addressing errors that somehow were not previously detected.
 * This test is done sequentially with each available CPU.
 *
 * Based on test.c :: addr_tst2()
 */


/*
 * Test 2 [Address test, own address, Parallel]
 * Same as test 1 but the testing is done in parallel using all CPUs and using overlapping addresses.
 */



/*
 * Test 3 [Moving inversions, ones&zeros, Parallel]
 * This test uses the moving inversions algorithm with patterns of all ones and zeros.
 * Cache is enabled even though it interferes to some degree with the test algorithm.
 * With cache enabled this test does not take long and should quickly find all "hard"
 * errors and some more subtle errors. This is done in parallel using all CPUs.
 * Based on test.c :: movinvr1()  (main.c / case 0)
 */

/*
 * Test 4 [Moving inversions, 8 bit pattern]
 * This is the same as test 3 but uses a 8 bit wide pattern of "walking" ones
 * and zeros. This test will better detect subtle errors in "wide" memory
 * chips.
 * Based on test.c :: movinvr1()  (main.c / case 1)
 */

/*
 * Test 5 [Moving inversions, random pattern]
 * Test 5 uses the same algorithm as test 4 but the data pattern is a random
 * number and it's complement. This test is particularly effective in finding
 * difficult to detect data sensitive errors. The random number sequence is
 * different with each pass so multiple passes increase effectiveness.
 * Based on test.c :: movinv32()  (main.c / case 2)
 */

/*
 * Test 6 [Block move, 64 moves]
 * This test stresses memory by using block move (movsl) instructions and is
 * based on Robert Redelmeier's burnBX test. Memory is initialized with
 * shifting patterns that are inverted every 8 bytes. Then 4mb blocks of
 * memory are moved around using the movsl instruction. After the moves are
 * completed the data patterns are checked. Because the data is checked only
 * after the memory moves are completed it is not possible to know where the
 * error occurred. The addresses reported are only for where the bad pattern
 * was found. Since the moves are constrained to a 8mb segment of memory the
 * failing address will always be less than 8mb away from the reported
 * address. Errors from this test are not used to calculate BadRAM patterns.
 */

/*
 * Test 7 [Moving inversions, 32 bit pattern]
 * This is a variation of the moving inversions algorithm that shifts the data
 * pattern left one bit for each successive address. The starting bit position
 * is shifted left for each pass. To use all possible data patterns 32 passes
 * are required. This test is quite effective at detecting data sensitive
 * errors but the execution time is long.
 */

/*
 * Test 8 [Random number sequence]

 * This test writes a series of random numbers into memory. By resetting the
 * seed for the random number the same sequence of number can be created for a
 * reference. The initial pattern is checked and then complemented and checked
 * again on the next pass. However, unlike the moving inversions test writing
 * and checking can only be done in the forward direction.
 * Based on test.c :: movinv1()  (main.c / case 10)
 */

/*
 * Test 9 [Modulo 20, Random pattern]
 * Using the Modulo-X algorithm should uncover errors that are not detected by
 * moving inversions due to cache and buffering interference with the
 * algorithm.
 * Based on test.c :: modtst()  (main.c / case 11)
 */
