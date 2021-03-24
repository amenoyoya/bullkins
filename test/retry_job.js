const axios = require('axios');
const yaml = `
name: TestRetryQueue
modules:
  - dayjs
main: !!js/function |-
  async function(job) {
    // main process: throw Error
    job.$throw(new Error('I throw new Error on purpose'));
  }
error: !!js/function |-
  async function(job, err) {
    // Store the error data into MongoDB
    await job.$mongodb.db('test').collection('error_logs').insert({
      error: err.stack, date: job.$module.dayjs().format('YYYY-MM-DD HH:mm:ss')
    });
    // Retry this job again: delay 10s, max 5 count
    if (++job.$yaml.count < 5) {
      job.$yaml.option = {delay: 10 * 1000};
      await job.$register(job.$yaml, 'jobs');
    }
  }
# Original variable: error count
count: 0
`;

axios.post('http://localhost:8000/api/bullkins/jobs', yaml, {headers: {'Content-Type': 'text/plain'}})
  .then(res => console.log(res.data))
  .catch(err => console.error(err));