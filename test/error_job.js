const axios = require('axios');
const yaml = `
name: TestErrorQueue
modules:
  - dayjs
main: !!js/function |-
  async function(job) {
    throw new Error('This is Error');
  }
error: !!js/function |-
  async function(job, err) {
    await job.$mongodb.db('test').collection('errors').insert({
      error: err.stack,
      date: job.$module.dayjs().format('YYYY-MM-DD HH:mm:ss')
    });
  }
`;

axios.post('http://localhost:8000/api/bullkins/jobs', {yaml})
  .then(res => console.log(res.data))
  .catch(err => console.log(err.response.data));