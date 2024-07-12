const initBase = require('./init.spec');

(() => 
{
    describe('Frontend Access', ()=>
    {
        it('Index.html Access', done => 
        {
            initBase
            .request(`http://localhost:${process.env.PORT}`)
            .get('/')
            .end(function(err, res) 
            { 
                initBase.expect(res).to.have.status(200); 
                done();
            });
        })
    });
})();