const axios = require('axios');
const fs = require('fs');

axios.post('http://localhost:8000/api/bullkins/jobs', fs.readFileSync(`${__dirname}/bullkins.yml`, 'utf-8'), {
  headers: {
    'Content-Type': 'text/plain',
  },
  responseType: 'json',
})
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
