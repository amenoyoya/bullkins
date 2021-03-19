const axios = require('axios');
const fs = require('fs');

axios.post('http://localhost:8000/api/bullkins/jobs', {yaml: fs.readFileSync(`${__dirname}/bullkins.yml`, 'utf-8')})
  .then(res => console.log(res.data))
  .catch(err => console.error(err.response.data));
