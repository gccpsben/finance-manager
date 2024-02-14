const chai = require("fix-esm").require('chai');
const mongoUnit = require('mongo-unit')
const testData = require('./testData.json');
const accessToken = require('../../server_build/finance/accessToken');

describe('Basic Database Access', ()=>
{
    let runTests = () => 
    {
        beforeEach(async () => { await mongoUnit.load(testData) })
        
        afterEach(() => mongoUnit.drop())

        it('Find AccessToken count: 1', () => 
        {
            return accessToken.AccessTokenClassModel.find({})
            .then(tokens => { chai.expect(tokens.length).to.equal(1) })
        })
    };

    try { runTests() } catch(e) { console.log(e); };
});