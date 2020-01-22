import _ from 'lodash';

// A package for running jobs synchronized across multiple processes
// Based on percolate:synced-cron, but modified to use MySQL
// https://github.com/percolatestudio/meteor-synced-cron

/*
Cron requires the MySQL database to have a table with the following schema:

CREATE TABLE `cron_history` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `intendedAt` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `startedAt` timestamp NULL DEFAULT NULL,
  `finishedAt` timestamp NULL DEFAULT NULL,
  `result` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `intendedAtname` (`intendedAt`,`name`),
  KEY `startedAt` (`startedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/

SyncedCron = {
  _entries: {},
  running: false,
  options: {
    log: true,//Log job run details to console
    logger: null,
    utc: false,//Default to using localTime
    //TTL in seconds for history records in table to expire
    collectionTTL: 172800
  },
  config: function(opts) {
    this.options = _.extend({}, this.options, opts);
  }
}

import Later from 'later';

/*
  Logger factory function. Takes a prefix string and options object
  and uses an injected `logger` if provided, else falls back to
  Meteor's `Log` package.

  Will send a log object to the injected logger, on the following form:

    message: String
    level: String (info, warn, error, debug)
    tag: 'SyncedCron'
*/
function createLogger(prefix) {
  check(prefix, String);

  // Return noop if logging is disabled.
  if(SyncedCron.options.log === false) {
    return function() {};
  }

  return function(level, message) {

    check(level, Match.OneOf('info', 'error', 'warn', 'debug'));
    check(message, String);

    var logger = SyncedCron.options && SyncedCron.options.logger;

    if(logger && _.isFunction(logger)) {

      logger({
        level: level,
        message: message,
        tag: prefix
      });

    } else {
      Log[level]({ message: prefix + ': ' + message });
    }
  }
}

var log;

Meteor.startup(function() {
  var options = SyncedCron.options;

  log = createLogger('SyncedCron');

  ['info', 'warn', 'error', 'debug'].forEach(function(level) {
    log[level] = _.partial(log, level);
  });

  // Don't allow TTL less than 5 minutes so we don't break synchronization
  var minTTL = 300;

  // Use UTC or localtime for evaluating schedules
  if (options.utc)
    Later.date.UTC();
  else
    Later.date.localTime();

});

var scheduleEntry = function(entry) {
  var schedule = entry.schedule(Later.parse);
  entry._timer =
    SyncedCron._laterSetInterval(SyncedCron._entryWrapper(entry), schedule);

  log.info('Scheduled "' + entry.name + '" next run @'
    + Later.schedule(schedule).next(1));
}

// add a scheduled job
// SyncedCron.add({
//   name: String, //*required* unique name of the job
//   schedule: function(laterParser) {},//*required* when to run the job
//   job: function() {}, //*required* the code to run
// });
SyncedCron.add = function(entry) {
  check(entry.name, String);
  check(entry.schedule, Function);
  check(entry.job, Function);

  // check
  if (!this._entries[entry.name]) {
    this._entries[entry.name] = entry;

    // If cron is already running, start directly.
    if (this.running) {
      scheduleEntry(entry);
    }
  }
}

// Start processing added jobs
SyncedCron.start = function() {
  var self = this;

  Meteor.startup(function() {
    // Schedule each job with later.js
    _.each(self._entries, function(entry) {
      scheduleEntry(entry);
    });
    self.running = true;
  });
}

// Return the next scheduled date of the first matching entry or undefined
SyncedCron.nextScheduledAtDate = function(jobName) {
  var entry = this._entries[jobName];

  if (entry)
    return Later.schedule(entry.schedule(Later.parse)).next(1);
}

// Remove and stop the entry referenced by jobName
SyncedCron.remove = function(jobName) {
  var entry = this._entries[jobName];

  if (entry) {
    if (entry._timer)
      entry._timer.clear();

    delete this._entries[jobName];
    log.info('Removed "' + entry.name + '"');
  }
}

// Pause processing, but do not remove jobs so that the start method will
// restart existing jobs
SyncedCron.pause = function() {
  if (this.running) {
    _.each(this._entries, function(entry) {
      entry._timer.clear();
    });
    this.running = false;
  }
}

// Stop processing and remove ALL jobs
SyncedCron.stop = function() {
  _.each(this._entries, function(entry, name) {
    SyncedCron.remove(name);
  });
  this.running = false;
}

// The meat of our logic. Checks if the specified has already run. If not,
// records that it's running the job, runs it, and records the output
SyncedCron._entryWrapper = function(entry) {
  var self = this;

  return function(intendedAt) {
    intendedAt = new Date(intendedAt.getTime());
    intendedAt.setMilliseconds(0);

    var jobHistory = {
      intendedAt: intendedAt,
      name: entry.name,
      startedAt: new Date()
    };

    // If we have a dup key error, another instance has already tried to run
    // this job.
    try
    {
      result = queryLiveDb(	"INSERT INTO cron_history (intendedAt, name, startedAt) VALUES (?,?,?)",
					 [jobHistory.intendedAt.toISOString(), jobHistory.name, jobHistory.startedAt.toISOString()]);
      jobHistory._id = result.insertId;
    }
    catch(e)
    {
      if (e.code == "ER_DUP_ENTRY")
      {
        console.log("Cant insert into cron_history due to duplicate entry: "+entry.name +" intendedAt: "+jobHistory.intendedAt);
        intendedAt = new Date().getTime()+10000; //Reset the intendedAt time to be ten seconds from now, as we may have failed the query above, and will get into a deadlock condition.
          return;
      }
      else
      {
        console.log("Exception in Sycnd cron: "+JSON.stringify({"name":entry.name, "e: ":e.message}));
        return;
      }
    };

    // run and record the job
    try
    {
      log.info('Starting "' + entry.name + '".');
      var output = entry.job(intendedAt,entry.name); // <- Run the actual job

      output = (output == null) ? "" : output;

      log.info('Finished "' + entry.name + '".');

      queryLiveDb(	"UPDATE cron_history SET finishedAt = ?, result = ? WHERE id = ?",
			[new Date().toISOString(), output, jobHistory._id]
		    );
    }
    catch(e)
    {
      log.info('Exception "' + entry.name +'" ' + e.stack);

     queryLiveDb(	"UPDATE cron_history SET finishedAt = ?, error = ? WHERE id = ?",
			[new Date().toISOString(), e.stack, jobHistory._id]
		   );

    }
  };
}

// for tests
SyncedCron._reset = function() {
  this._entries = {};

  queryLiveDb("TRUNCATE cron_history");

  this.running = false;
}

// ---------------------------------------------------------------------------
// The following two functions are lifted from the later.js package, however
// I've made the following changes:
// - Use Meteor.setTimeout and Meteor.clearTimeout
// - Added an 'intendedAt' parameter to the callback fn that specifies the precise
//   time the callback function *should* be run (so we can co-ordinate jobs)
//   between multiple, potentially laggy and unsynced machines

// From: https://github.com/bunkat/later/blob/master/src/core/setinterval.js
SyncedCron._laterSetInterval = function(fn, sched) {

  var t = SyncedCron._laterSetTimeout(scheduleTimeout, sched),
      done = false;

  /**
  * Executes the specified function and then sets the timeout for the next
  * interval.
  */
  function scheduleTimeout(intendedAt) {
    if(!done) {
      fn(intendedAt);
      t = SyncedCron._laterSetTimeout(scheduleTimeout, sched);
    }
  }

  return {

    /**
    * Clears the timeout.
    */
    clear: function() {
      done = true;
      t.clear();
    }

  };

};

// From: https://github.com/bunkat/later/blob/master/src/core/settimeout.js
SyncedCron._laterSetTimeout = function(fn, sched) {

  var s = Later.schedule(sched), t;
  scheduleTimeout();

  /**
  * Schedules the timeout to occur. If the next occurrence is greater than the
  * max supported delay (2147483647 ms) than we delay for that amount before
  * attempting to schedule the timeout again.
  */
  function scheduleTimeout() {
    var now = Date.now(),
        next = s.next(2, now);

    // don't schedlue another occurence if no more exist synced-cron#41
    if (! next[0])
      return;

    var diff = next[0].getTime() - now,
        intendedAt = next[0];

    // minimum time to fire is one second, use next occurrence instead
    if(diff < 1000) {
      diff = next[1].getTime() - now;
      intendedAt = next[1];
    }

    if(diff < 2147483647) {
      t = Meteor.setTimeout(function() { fn(intendedAt); }, diff);
    }
    else {
      t = Meteor.setTimeout(scheduleTimeout, 2147483647);
    }
  }

  return {

    /**
    * Clears the timeout.
    */
    clear: function() {
      Meteor.clearTimeout(t);
    }

  };

};
// ---------------------------------------------------------------------------
