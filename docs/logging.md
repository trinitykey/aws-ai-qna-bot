# QnABot Enhanced Logging -- Rough Draft

## Logging methods

Sends logs to stdout/CloudWatch Logs

```Javascript
function verbose(message,params={}) {...}
function debug(message,params={}) {...}
function info(message,params={}) {...}
function warn(message,params={}) {...}
function error(message,params={}) {...}
function fatal(message,params={}) {...}
```

- message: the log message. This will be passed in as a separate parameter by one of the exported log functions
- params (optional)
  - settings
        - REDACT_VERIFIED_USER_INFO (true|false) - redact properties that may contain PII when the user is logged in
        - REDACT_ALL_USER_INFO (true|false) -- redact all properties that may contain PII
    - req - the request object. The properties listed in the 'redactedUserProperties' will be redacted based on the above settings
    - res - the response object. The properties listed in the 'redactedUserProperties' will be redacted based on the above settings
    - messageParams - any JavaScript object that should be logged
    - PII - a JS string or object that should be redacted or logged based on the setting

## Usage

For ease of use, some parameters can be set one time and used across all calls.

```javascript
module.exports=async function query(req,res) {

    var logSettings = {
        req: req,
        res: res,
        settings: _.get(req,"_settings")
    }
```

In a simple case, there shouldn’t be too much ceremony calling the logging functionality. It should be just the message and the setting.

```javascript
log.info('Handling specialtyBot',logSettings);
```

To log information that may contain PII, you can pass PII to the PII parameter

```javascript
logSettings.PII = resp
log.info("No chaining. The following response is being made: ",logSettings);
logSettings.PII = undefined
```

If you need to log a complex JS object, it can be sent via the messageParams. This object will not be redacted.

```javacript
logSettings.messageParams = chainingConfig;
log.info("Conditional chaining: ",logSettings);
logSettings.messageParams = undefined;
```
