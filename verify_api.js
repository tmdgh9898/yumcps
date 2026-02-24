const axios = require('axios');

axios.get('http://localhost:5000/api/stats')
    .then(res => {
        console.log('API Stats Response:');
        console.table(res.data.slice(0, 5));
    })
    .catch(err => console.error(err));
