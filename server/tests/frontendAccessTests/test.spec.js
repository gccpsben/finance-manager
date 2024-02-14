const chai = require("fix-esm").require('chai');
const chaiHttp = require('chai-http');

describe('Basic Frontend Access', ()=>
{
    it('Index.html Access', done => 
    {
        chai.use(chaiHttp)
        .request('http://localhost:8081')
        .get('/')
        .end(function(err, res) 
        { 
            chai.expect(res).to.have.status(200); 
            done();
        });
    })
});