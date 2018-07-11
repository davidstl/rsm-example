var https = require('https');

exports.request = function(json, callback)
{
    // fetch configs from braincloud
    json.gameId = ""; // FILL ME
    json.serverName = ""; // FILL ME
    json.gameSecret = ""; // FILL ME

    var postData = JSON.stringify(json);

    console.log("[S2S SEND] " + postData);

    var options = {
        host: 'shareprod.braincloudservers.com',
        path: '/s2sdispatcher',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };

    var req = https.request(options, function(res) {
        var data = '';
        
        // A chunk of data has been recieved.
        res.on('data', function(chunk) {
            data += chunk;
        });
        
        // The whole response has been received. Print out the result.
        res.on('end', () => {
            console.log("[S2S RECV] " + data);
            if (callback)
            {
                if (data)
                {
                    callback(JSON.parse(data).response);
                }
                else
                {
                    callback(null);
                }
            }
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
        if (callback) callback(null);
    });

    // write data to request body
    req.write(postData);
    req.end();
}
