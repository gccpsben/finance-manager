const initBase = require('./init.spec');

(() => 
{
    describe('Frontend Access', ()=>
    {
        it('Index.html Access', done => 
        {
            initBase
            .request('http://localhost:8081')
            .get('/')
            .end(function(err, res) 
            { 
                initBase.expect(res).to.have.status(200); 
                done();
            });
        })
    });
})();