// @ts-check
// config 替换成自己的存储桶和账号信息
var config = {
  Bucket: 'test-1250000000',
  Region: 'ap-guangzhou',
  Uin: '10001',
};

var util = {
    createFile: function (options) {
        var buffer = new ArrayBuffer(options.size || 0);
        var arr = new Uint8Array(buffer);
        [].forEach.call(arr, function (char, i) {
            arr[i] = 0;
        });
        var opt = {};
        options.type && (opt.type = options.type);
        var blob = new Blob([buffer], options);
        return blob;
    },
    selectLocalFile: function (onChange) {
        var id = 'file_selector';
        var input = document.createElement('input');
        input.style = 'width:0;height:0;border:0;margin:0;padding:0;';
        input.type = 'file';
        input.id = id;
        input.onchange = function (e) {
            var files = this.files;
            if (!files.length) return;
            onChange && onChange(files);
            document.body.removeChild(input);
        };
        document.body.appendChild(input);
        input.click();
    },
};

// 对更多字符编码的 url encode 格式
var camSafeUrlEncode = function (str) {
    return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
};

var getAuthorization = function (options, callback) {

    // 格式一、（推荐）后端通过获取临时密钥给到前端，前端计算签名
    // 服务端 JS 和 PHP 例子：https://github.com/tencentyun/cos-js-sdk-v5/blob/master/server/
    // 服务端其他语言参考 COS STS SDK ：https://github.com/tencentyun/qcloud-cos-sts-sdk
    var url = '/sts'; // 如果是 npm run sts.js 起的 nodejs server，使用这个
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function (e) {
        try {
            var data = JSON.parse(e.target.responseText);
            var credentials = data.credentials;
        } catch (e) {
        }
        if (!data || !credentials) {
            return logger.error('credentials invalid:\n' + JSON.stringify(data, null, 2))
        };
        callback({
            TmpSecretId: credentials.tmpSecretId,
            TmpSecretKey: credentials.tmpSecretKey,
            SecurityToken: credentials.sessionToken,
            StartTime: data.startTime, // 时间戳，单位秒，如：1580000000，建议返回服务器时间作为签名的开始时间，避免用户浏览器本地时间偏差过大导致签名错误
            ExpiredTime: data.expiredTime, // 时间戳，单位秒，如：1580000000
            ScopeLimit: true, // 细粒度控制权限需要设为 true，会限制密钥只在相同请求时重复使用
        });
    };
    xhr.send(JSON.stringify(options.Scope));


    // // 格式二、（推荐）【细粒度控制权限】后端通过获取临时密钥给到前端，前端只有相同请求才重复使用临时密钥，后端可以通过 Scope 细粒度控制权限
    // // 服务端例子：https://github.com/tencentyun/qcloud-cos-sts-sdk/edit/master/scope.md
    // // var url = '../server/sts.php'; // 如果起的是 php server 用这个
    // var url = '/sts-scope'; // 如果是 npm run sts.js 起的 nodejs server，使用这个
    // var xhr = new XMLHttpRequest();
    // xhr.open('POST', url, true);
    // xhr.setRequestHeader('Content-Type', 'application/json');
    // xhr.onload = function (e) {
    //     try {
    //         var data = JSON.parse(e.target.responseText);
    //         var credentials = data.credentials;
    //     } catch (e) {
    //     }
    //     if (!data || !credentials) {
    //         return logger.error('credentials invalid:\n' + JSON.stringify(data, null, 2))
    //     };
    //     callback({
    //         TmpSecretId: credentials.tmpSecretId,
    //         TmpSecretKey: credentials.tmpSecretKey,
    //         SecurityToken: credentials.sessionToken,
    //         StartTime: data.startTime, // 时间戳，单位秒，如：1580000000，建议返回服务器时间作为签名的开始时间，避免用户浏览器本地时间偏差过大导致签名错误
    //         ExpiredTime: data.expiredTime, // 时间戳，单位秒，如：1580000000
    //         ScopeLimit: true, // 细粒度控制权限需要设为 true，会限制密钥只在相同请求时重复使用
    //     });
    // };
    // xhr.send(JSON.stringify(options.Scope));


    // // 格式三、（不推荐，分片上传权限不好控制）前端每次请求前都需要通过 getAuthorization 获取签名，后端使用固定密钥或临时密钥计算签名返回给前端
    // // 服务端获取签名，请参考对应语言的 COS SDK：https://cloud.tencent.com/document/product/436/6474
    // // 注意：这种有安全风险，后端需要通过 method、pathname 严格控制好权限，比如不允许 put / 等
    // var method = (options.Method || 'get').toLowerCase();
    // var query = options.Query || {};
    // var headers = options.Headers || {};
    // var pathname = options.Pathname || '/';
    // // var url = 'http://127.0.0.1:3000/auth';
    // var url = '../server/auth.php';
    // var xhr = new XMLHttpRequest();
    // var data = {
    //     method: method,
    //     pathname: pathname,
    //     query: query,
    //     headers: headers,
    // };
    // xhr.open('POST', url, true);
    // xhr.setRequestHeader('content-type', 'application/json');
    // xhr.onload = function (e) {
    //     try {
    //         var data = JSON.parse(e.target.responseText);
    //     } catch (e) {
    //     }
    //     if (!data || !data.authorization) return console.error('authorization invalid');
    //     callback({
    //         Authorization: data.authorization,
    //         // SecurityToken: data.sessionToken, // 如果使用临时密钥，需要把 sessionToken 传给 SecurityToken
    //     });
    // };
    // xhr.send(JSON.stringify(data));


    // // 格式四、（不推荐，适用于前端调试，避免泄露密钥）前端使用固定密钥计算签名
    // var authorization = COS.getAuthorization({
    //     SecretId: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // 可传固定密钥或者临时密钥
    //     SecretKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // 可传固定密钥或者临时密钥
    //     Method: options.Method,
    //     Pathname: options.Pathname,
    //     Query: options.Query,
    //     Headers: options.Headers,
    //     Expires: 900,
    // });
    // callback({
    //     Authorization: authorization,
    //     // SecurityToken: credentials.sessionToken, // 如果使用临时密钥，需要传 SecurityToken
    // });

};

var cos = new COS({
    getAuthorization: getAuthorization,
    UploadCheckContentMd5: true,
});

var TaskId;

var pre = document.querySelector('.result');
var showLogText = function (text, color) {
    if (typeof text === 'object') {
        try {
            text = JSON.stringify(text);
        } catch (e) {
        }
    }
    var div = document.createElement('div');
    div.innerText = text;
    color && (div.style.color = color);
    pre.appendChild(div);
    pre.style.display = 'block';
    pre.scrollTop = pre.scrollHeight;
};

var logger = {
    log: function (text) {
        console.log.apply(console, arguments);
        var args = [].map.call(arguments, function (v) {
            return typeof v === 'object' ? JSON.stringify(v, null, 2) : v;
        });

        var logStr = args.join(' ');

        if(logStr.length > 1000000) {
            logStr = logStr.slice(0, 1000000) + '...content is too long, the first 1000000 characters are intercepted';
        }

        showLogText(logStr);
    },
    error: function (text) {
        console.error(text);
        showLogText(text, 'red');
    },
};

function getObjectUrl() {
    var url = cos.getObjectUrl({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1mb.zip',
        Expires: 60,
        Sign: true,
    }, function (err, data) {
        logger.log('getObjectUrl:', err || data && data.Url);
    });
    logger.log('getObjectUrl:', url);
}

function getAuth() {
    var key = '1.png';
    // 这里不推荐自己拼接，推荐使用 getObjectUrl 获取 url
    getAuthorization({
        Method: 'get',
        Key: key
    }, function (AuthData) {
        if (typeof AuthData === 'string') {
            AuthData = {Authorization: AuthData};
        }
        var url = 'http://' + config.Bucket + '.cos.' + config.Region + '.myqcloud.com' + '/' +
            camSafeUrlEncode(key).replace(/%2F/g, '/') +
            '?' + AuthData +
            (AuthData.SecurityToken ? '&' + AuthData.SecurityToken : '');
        logger.log('getAuth:', url);
    });
}

// getService、putBucket 接口会跨域，不支持浏览器使用，只在场景下可调用，比如改了 ServiceDomain 到代理地址
function getService() {
    cos.getService(function (err, data) {
        logger.log('getService:', err || data);
    });
}

// getService、putBucket 接口会跨域，不支持浏览器使用，只在场景下可调用，比如改了 ServiceDomain 到代理地址
function putBucket() {
    cos.putBucket({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        // Prefix: 'dir/'
        // Delimiter: '/'
    }, function (err, data) {
        logger.log('putBucket:', err || data);
    });
}

function getBucket() {
    cos.getBucket({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Prefix: '',
        Delimiter: '/'
    }, function (err, data) {
        logger.log('getBucket:', err || data);
    });
}

function headBucket() {
    cos.headBucket({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('headBucket:', err || data);
    });
}

function deleteBucket() {
    cos.deleteBucket({
        Bucket: 'testnew-' + config.Bucket.substr(config.Bucket.lastIndexOf('-') + 1),
        Region: 'ap-guangzhou'
    }, function (err, data) {
        logger.log('deleteBucket:', err || data);
    });
}

function putBucketAcl() {
    cos.putBucketAcl({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        // GrantFullControl: 'id="qcs::cam::uin/1001:uin/1001",id="qcs::cam::uin/1002:uin/1002"',
        // GrantWrite: 'id="qcs::cam::uin/1001:uin/1001",id="qcs::cam::uin/1002:uin/1002"',
        // GrantRead: 'id="qcs::cam::uin/1001:uin/1001",id="qcs::cam::uin/1002:uin/1002"',
        // GrantReadAcp: 'id="qcs::cam::uin/1001:uin/1001",id="qcs::cam::uin/1002:uin/1002"',
        // GrantWriteAcp: 'id="qcs::cam::uin/1001:uin/1001",id="qcs::cam::uin/1002:uin/1002"',
        // ACL: 'public-read-write',
        // ACL: 'public-read',
        ACL: 'private',
        // AccessControlPolicy: {
        // "Owner": { // AccessControlPolicy 里必须有 owner
        //     "ID": 'qcs::cam::uin/10001:uin/10001' // 10001 是 Bucket 所属用户的 QQ 号
        // },
        // "Grants": [{
        //     "Grantee": {
        //         "URI": "http://cam.qcloud.com/groups/global/AllUsers", // 允许匿名用户组访问
        //     },
        //     "Permission": "READ"
        // }, {
        //     "Grantee": {
        //         "ID": "qcs::cam::uin/10002:uin/10002", // 10002 是 QQ 号
        //     },
        //     "Permission": "WRITE"
        // }, {
        //     "Grantee": {
        //         "ID": "qcs::cam::uin/10002:uin/10002", // 10002 是 QQ 号
        //     },
        //     "Permission": "READ_ACP"
        // }, {
        //     "Grantee": {
        //         "ID": "qcs::cam::uin/10002:uin/10002", // 10002 是 QQ 号
        //     },
        //     "Permission": "WRITE_ACP"
        // }]
        // }
    }, function (err, data) {
        logger.log('putBucketAcl:', err || data);
    });
}

function getBucketAcl() {
    cos.getBucketAcl({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('getBucketAcl:', err || data);
    });
}

function putBucketCors() {
    cos.putBucketCors({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        ResponseVary: "true",
        CORSRules: [{
            "AllowedOrigin": ["*"],
            "AllowedMethod": ["GET", "POST", "PUT", "DELETE", "HEAD"],
            "AllowedHeader": ["*"],
            "ExposeHeader": ["ETag", "Date", "Content-Length", "x-cos-acl", "x-cos-version-id", "x-cos-request-id", "x-cos-delete-marker", "x-cos-server-side-encryption"],
            "MaxAgeSeconds": "5"
        }]
    }, function (err, data) {
        logger.log('putBucketCors:', err || data);
    });
}

function getBucketCors() {
    cos.getBucketCors({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('getBucketCors:', err || data);
    });
}

function deleteBucketCors() {
    cos.deleteBucketCors({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('deleteBucketCors:', err || data);
    });
}

function putBucketTagging() {
    cos.putBucketTagging({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Tagging: {
            "Tags": [
                {"Key": "k1", "Value": "v1"},
                {"Key": "k2", "Value": "v2"}
            ]
        }
    }, function (err, data) {
        logger.log('putBucketTagging:', err || data);
    });
}

function getBucketTagging() {
    cos.getBucketTagging({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('getBucketTagging:', err || data);
    });
}

function deleteBucketTagging() {
    cos.deleteBucketTagging({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('deleteBucketTagging:', err || data);
    });
}

function putBucketPolicy() {
    var AppId = config.Bucket.substr(config.Bucket.lastIndexOf('-') + 1);
    cos.putBucketPolicy({
        Policy: {
            "version": "2.0",
            "statement": [{
                "effect": "allow",
                "principal": {"qcs": ["qcs::cam::uin/10001:uin/10001"]}, // 这里的 10001 是 QQ 号
                "action": [
                    // 这里可以从临时密钥的权限上控制前端允许的操作
                    // 'name/cos:*', // 这样写可以包含下面所有权限

                    // // 列出所有允许的操作
                    // // ACL 读写
                    // 'name/cos:GetBucketACL',
                    // 'name/cos:PutBucketACL',
                    // 'name/cos:GetObjectACL',
                    // 'name/cos:PutObjectACL',
                    // // 简单 Bucket 操作
                    // 'name/cos:PutBucket',
                    // 'name/cos:HeadBucket',
                    // 'name/cos:GetBucket',
                    // 'name/cos:DeleteBucket',
                    // 'name/cos:GetBucketLocation',
                    // // Versioning
                    // 'name/cos:PutBucketVersioning',
                    // 'name/cos:GetBucketVersioning',
                    // // CORS
                    // 'name/cos:PutBucketCORS',
                    // 'name/cos:GetBucketCORS',
                    // 'name/cos:DeleteBucketCORS',
                    // // Lifecycle
                    // 'name/cos:PutBucketLifecycle',
                    // 'name/cos:GetBucketLifecycle',
                    // 'name/cos:DeleteBucketLifecycle',
                    // // Replication
                    // 'name/cos:PutBucketReplication',
                    // 'name/cos:GetBucketReplication',
                    // 'name/cos:DeleteBucketReplication',
                    // // 删除文件
                    // 'name/cos:DeleteMultipleObject',
                    // 'name/cos:DeleteObject',
                    // 简单文件操作
                    'name/cos:PutObject',
                    'name/cos:AppendObject',
                    'name/cos:GetObject',
                    'name/cos:HeadObject',
                    'name/cos:OptionsObject',
                    'name/cos:PutObjectCopy',
                    'name/cos:PostObjectRestore',
                    // 分片上传操作
                    'name/cos:InitiateMultipartUpload',
                    'name/cos:ListMultipartUploads',
                    'name/cos:ListParts',
                    'name/cos:UploadPart',
                    'name/cos:CompleteMultipartUpload',
                    'name/cos:AbortMultipartUpload',
                ],
                // "resource": ["qcs::cos:ap-guangzhou:uid/1250000000:test-1250000000/*"] // 1250000000 是 appid
                "resource": ["qcs::cos:" + config.Region + ":uid/" + AppId + ":" + config.Bucket + "/*"] // 1250000000 是 appid
            }]
        },
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('putBucketPolicy:', err || data);
    });
}

function getBucketPolicy() {
    cos.getBucketPolicy({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('getBucketPolicy:', err || data);
    });
}

function deleteBucketPolicy() {
    cos.deleteBucketPolicy({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('deleteBucketPolicy:', err || data);
    });
}

function getBucketLocation() {
    cos.getBucketLocation({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('getBucketLocation:', err || data);
    });
}

function putBucketLifecycle() {
    cos.putBucketLifecycle({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        LifecycleConfiguration: {
            Rules: [{
                "ID": "1",
                "Status": "Enabled",
                "Filter": {},
                "Transition": {
                    "Days": "30",
                    "StorageClass": "STANDARD_IA"
                }
            }, {
                "ID": "2",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "dir/"
                },
                "Transition": {
                    "Days": "90",
                    "StorageClass": "ARCHIVE"
                }
            }, {
                "ID": "3",
                "Status": "Enabled",
                "Filter": {},
                "Expiration": {
                    "Days": "180"
                }
            }, {
                "ID": "4",
                "Status": "Enabled",
                "Filter": {},
                "AbortIncompleteMultipartUpload": {
                    "DaysAfterInitiation": "30"
                }
            }],
        }
    }, function (err, data) {
        logger.log('putBucketLifecycle:', err || data);
    });
}

function getBucketLifecycle() {
    cos.getBucketLifecycle({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('getBucketLifecycle:', err || data);
    });
}

function deleteBucketLifecycle() {
    cos.deleteBucketLifecycle({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('deleteBucketLifecycle:', err || data);
    });
}

function putBucketVersioning() {
    cos.putBucketVersioning({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        VersioningConfiguration: {
            Status: "Enabled"
        }
    }, function (err, data) {
        logger.log('putBucketVersioning:', err || data);
    });
}

function getBucketVersioning() {
    cos.getBucketVersioning({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('getBucketVersioning:', err || data);
    });
}

function listObjectVersions() {
    cos.listObjectVersions({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        // Prefix: "",
        // Delimiter: '/'
    }, function (err, data) {
        logger.log('listObjectVersions:', err || JSON.stringify(data, null, '    '));
    });
}

function putBucketReplication() {
    var AppId = config.Bucket.substr(config.Bucket.lastIndexOf('-') + 1);
    cos.putBucketReplication({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        ReplicationConfiguration: {
            Role: "qcs::cam::uin/10001:uin/10001",
            Rules: [{
                ID: "1",
                Status: "Enabled",
                Prefix: "sync/",
                Destination: {
                    Bucket: "qcs:id/0:cos:ap-chengdu:appid/" + AppId + ":backup",
                    // StorageClass: "Standard",
                }
            }]
        }
    }, function (err, data) {
        logger.log('putBucketReplication:', err || data);
    });
}

function getBucketReplication() {
    cos.getBucketReplication({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('getBucketReplication:', err || data);
    });
}

function deleteBucketReplication() {
    cos.deleteBucketReplication({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('deleteBucketReplication:', err || data);
    });
}

function putBucketWebsite() {
    cos.putBucketWebsite({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        WebsiteConfiguration: {
            IndexDocument: {
                Suffix: "index.html" // 必选
            },
            RedirectAllRequestsTo: {
                Protocol: "https"
            },
            // ErrorDocument: {
            //     Key: "error.html"
            // },
            // RoutingRules: [{
            //     Condition: {
            //         HttpErrorCodeReturnedEquals: "404"
            //     },
            //     Redirect: {
            //         Protocol: "https",
            //         ReplaceKeyWith: "404.html"
            //     }
            // }, {
            //     Condition: {
            //         KeyPrefixEquals: "docs/"
            //     },
            //     Redirect: {
            //         Protocol: "https",
            //         ReplaceKeyPrefixWith: "documents/"
            //     }
            // }, {
            //     Condition: {
            //         KeyPrefixEquals: "img/"
            //     },
            //     Redirect: {
            //         Protocol: "https",
            //         ReplaceKeyWith: "picture.jpg"
            //     }
            // }]
        }
    }, function (err, data) {
        logger.log('putBucketWebsite:', err || data);
    });
}

function getBucketWebsite() {
    cos.getBucketWebsite({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    },function(err, data){
        logger.log('getBucketWebsite:', err || data);
    });
}

function deleteBucketWebsite() {
    cos.deleteBucketWebsite({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    },function(err, data){
        logger.log('deleteBucketWebsite:', err || data);
    });
}

function putBucketReferer() {
    cos.putBucketReferer({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        RefererConfiguration: {
            Status: 'Enabled',
            RefererType: 'White-List',
            DomainList: {
                Domains: [
                    '*.qq.com',
                    '*.qcloud.com',
                ]
            },
            EmptyReferConfiguration: 'Allow',
        }
    }, function (err, data) {
        logger.log('putBucketReferer:', err || data);
    });
}

function getBucketReferer() {
    cos.getBucketReferer({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    },function(err, data){
        logger.log('getBucketReferer:', err || JSON.stringify(data, null, '    '));
    });
}

function putBucketDomain() {
    cos.putBucketDomain({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        DomainRule:[{
            Status: "DISABLED",
            Name: "www.testDomain1.com",
            Type: "REST"
        }, {
            Status: "DISABLED",
            Name: "www.testDomain2.com",
            Type: "WEBSITE"
        }]
    },function(err, data){
        logger.log('putBucketDomain:', err || data);
    });
}

function getBucketDomain() {
    cos.getBucketDomain({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    },function(err, data){
        logger.log('getBucketDomain:', err || data);
    });
}

function deleteBucketDomain() {
    cos.deleteBucketDomain({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    },function(err, data){
        logger.log('deleteBucketDomain:', err || data);
    });
}

function putBucketLogging() {
    var AppId = config.Bucket.substr(config.Bucket.lastIndexOf('-') + 1);
    cos.putBucketLogging({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        BucketLoggingStatus: {
            LoggingEnabled: {
                TargetBucket: 'bucket-logging-' + AppId,
                TargetPrefix: 'logging'
            }
        }
    }, function (err, data) {
        logger.log('putBucketLogging:', err || data);
    });
}

function getBucketLogging() {
    cos.getBucketLogging({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region
    }, function (err, data) {
        logger.log('getBucketLogging:', err || data);
    });
}

function deleteBucketLogging() {
    cos.putBucketLogging({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        BucketLoggingStatus: {}
    }, function (err, data) {
        logger.log('deleteBucketLogging:', err || data);
    });
}

function putBucketInventory() {
    var AppId = config.Bucket.substr(config.Bucket.lastIndexOf('-') + 1);
    cos.putBucketInventory({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Id: 'inventory_test',
        InventoryConfiguration: {
            Id: 'inventory_test',
            IsEnabled: 'true',
            Destination: {
                COSBucketDestination: {
                    Format: 'CSV',
                    AccountId: config.Uin,
                    Bucket: 'qcs::cos:' + config.Region + '::' + config.Bucket,
                    Prefix: 'inventory',
                    Encryption: {
                        SSECOS: ''
                    }
                }
            },
            Schedule: {
                Frequency: 'Daily'
            },
            Filter: {
                Prefix: 'myPrefix'
            },
            IncludedObjectVersions: 'All',
            OptionalFields: [
                'Size',
                'LastModifiedDate',
                'ETag',
                'StorageClass',
                'IsMultipartUploaded',
                'ReplicationStatus'
            ]
        }
    }, function (err, data) {
        logger.log('putBucketInventory:', err || data);
    });
}

function getBucketInventory() {
    cos.getBucketInventory({
        Bucket: config.Bucket,
        Region: config.Region,
        Id: 'inventory_test'
    }, function(err, data) {
        logger.log('getBucketInventory:', err || JSON.stringify(data));
    });
}

function deleteBucketInventory() {
    cos.deleteBucketInventory({
        Bucket: config.Bucket,
        Region: config.Region,
        Id: 'inventory_test'
    }, function(err, data) {
        logger.log('deleteBucketInventory:', err || JSON.stringify(data));
    });
}

function listBucketInventory() {
    cos.listBucketInventory({
        Bucket: config.Bucket,
        Region: config.Region
    }, function(err, data) {
        logger.log('listBucketInventory:', err || JSON.stringify(data));
    });
}

function putBucketEncryption() {
    cos.putBucketEncryption({
        Bucket: config.Bucket,
        Region: config.Region,
        ServerSideEncryptionConfiguration: {
            Rule: [{
                ApplySideEncryptionConfiguration: {
                    SSEAlgorithm: 'AES256',
                },
            }],
        },
    }, function(err, data) {
        logger.log('putBucketEncryption:', err || JSON.stringify(data));
    });
}

function getBucketEncryption() {
    cos.getBucketEncryption({
        Bucket: config.Bucket,
        Region: config.Region
    }, function(err, data) {
        logger.log('getBucketEncryption:', err || JSON.stringify(data));
    });
}

function deleteBucketEncryption() {
    cos.deleteBucketEncryption({
        Bucket: config.Bucket,
        Region: config.Region
    }, function(err, data) {
        logger.log('deleteBucketEncryption:', err || JSON.stringify(data));
    });
}

function putObject() {
    // 创建测试文件
    var filename = '1mb.zip';
    var blob = util.createFile({size: 1024 * 1024 * 1});
    // 调用方法
    cos.putObject({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: filename, /* 必须 */
        Body: blob,
        onTaskReady: function (tid) {
            TaskId = tid;
            logger.log('onTaskReady', tid);
        },
        onTaskStart: function (info) {
            logger.log('onTaskStart', info);
        },
        onProgress: function (progressData) {
            logger.log(JSON.stringify(progressData));
        },
        Headers: {
            // 万象持久化接口，上传时持久化
            // 'Pic-Operations': '{"is_pic_info": 1, "rules": [{"fileid": "test.jpg", "rule": "imageMogr2/thumbnail/!50p"}]}'
        },
    }, function (err, data) {
        logger.log('putObject:', err || data);
    });
}

// 简单上传 文件boby为base64
function putObject_base64ToBlob() {
    var base64Url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAABRFBMVEUAAAAAo/8Ao/8Ao/8Ao/8ApP8Aov8Ao/8Abv8Abv8AyNwAyNwAo/8Ao/8Ao/8Abv8Ao/8AivgAo/8AyNwAbv8Abv8AydwApf8Abf8Ao/8AbP8Ao/8AyNwAydwAbv8AydwApP8Ao/8AyNwAo/8AyNwAydsAyNwAxd8Aov8AyNwAytsAo/8Abv8AyNwAbv8Av+MAo/8AytsAo/8Abv8AyNwAo/8Abv8AqfkAbv8Aov8Abv8AyNwAov8Abv8Ao/8Abv8Ao/8AydwAo/8Ao/8Ate8Ay9oAvOcAof8AveAAyNwAyNwAo/8AyNwAy9kAo/8AyNwAyNwAo/8AqP8Aaf8AyNwAbv0Abv8Abv8AaP8Ao/8Ao/8Ao/8Ao/8Abv8AyNwAgvcAaP8A0dkAo/8AyNwAav8Abv8Ao/8Abv8AyNwAy9sAvOUAtePdkYxjAAAAZnRSTlMAw/co8uAuJAn8+/Tt29R8DAX77+nZz87Jv6CTh3lxTklAPjouJRsL5tjAuLiyr62roaCakYp0XVtOQTMyLiohICAcGRP49vTv5+PJurawq6mnnJuYl4+OiIB7eXVvX15QSDgqHxNcw3l6AAABe0lEQVQ4y82P11oCQQxGIy5FUJpKk6aAhV6k92LvvXedDfj+92ZkYQHxnnMxu3/OfJMEJo6y++baXf5XVw22GVGcsRmq431mQZRYyIzRGgdXi+HwIv86NDBKisrRAtU1hSj9pkZ9jpo/9YKbRsmNNKCHDXI00BxfMMirKNpMcjQ5Lm4/YZArUXyBYUwg40nsdr5jb3LBe25VWpNeKa1GENsEnq52C80z1uW48estiKjb19G54QdCrScnKAU69U3KJ4jzrsBawDWPuOcBqMyRvlcb1Y+zjMUBVsivAKe4gXgEKiVjSh9wlunGMmwiOqFL3RI0cj+nkgp3jC1BELVFkGiZSuvkp3tZZWZ2sKCuDj185PXqfmwI7AAOUctHkJoOeXg3sxA4ES+l7CVvrYHMEmNp8GtR+wycPG0+1RrwWQUzl4CvgQmPP5Ddofl8tWkJVT7J+BIAaxEktrYZoRAUfXgOGYHfcOqw3WF/EdLccz5cMfvUCPb4QwUmhB8+v12HZPCkbgAAAABJRU5ErkJggg==';
    var dataURLtoBlob = function (dataurl) {
      var arr = dataurl.split(',');
      var mime = arr[0].match(/:(.*?);/)[1];
      var bstr = atob(arr[1]);
      var n = bstr.length;
      var u8arr = new Uint8Array(n);
      while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
     };
    // 调用方法
    cos.putObject({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: 'base64_file.png', /* 必须 */
        Body: dataURLtoBlob(base64Url),
        onTaskReady: function (tid) {
            logger.log('onTaskReady', tid);
        },
        onTaskStart: function (info) {
            logger.log('onTaskStart', info);
        },
        onProgress: function (progressData) {
            logger.log(JSON.stringify(progressData));
        },
        Headers: {
            // 万象持久化接口，上传时持久化
            // 'Pic-Operations': '{"is_pic_info": 1, "rules": [{"fileid": "test.jpg", "rule": "imageMogr2/thumbnail/!50p"}]}'
        },
    }, function (err, data) {
        logger.log('putObject:', err || data);
    });
}

function appendObject() {
    cos.appendObject({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: 'append.txt', /* 必须 */
        Body: '12345',
        Position: 0,
    },
    function(err, data) {
        logger.log('putObject:', err || data);
    })
}

function appendObject_continue() {
    cos.headObject({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: 'append.txt', /* 必须 */
    }, function(err, data) {
        if (err) return console.log(err);
        // 首先取到要追加的文件当前长度，即需要上送的Position
        var position = data.headers['content-length'];
        cos.appendObject({
            Bucket: config.Bucket, // Bucket 格式：test-1250000000
            Region: config.Region,
            Key: 'append.txt', /* 必须 */
            Body: '66666',
            Position: position,
        },
        function(err, data) {
            // 也可以取到下一次上传的position继续追加上传
            // var nextPosition = data.headers['x-cos-next-append-position'];
            logger.log('putObject:', err || data);
        })
    });
}

function putObjectCopy() {
    cos.putObjectCopy({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1mb.copy.zip',
        CopySource: config.Bucket + '.cos.' + config.Region + '.myqcloud.com/' + camSafeUrlEncode('1mb.zip').replace(/%2F/g, '/'), // Bucket 格式：test-1250000000
    }, function (err, data) {
        logger.log('putObjectCopy:', err || data);
    });
}

function getObject() {
    cos.getObject({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1mb.zip',
        onProgress: function (progressData) {
            logger.log(JSON.stringify(progressData));
        }
    }, function (err, data) {
        logger.log('getObject:', err || data);
    });
}

function headObject() {
    cos.headObject({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1mb.zip'
    }, function (err, data) {
        logger.log('headObject:', err || data);
    });
}

function putObjectAcl() {
    cos.putObjectAcl({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1mb.zip',
        // GrantFullControl: 'id="qcs::cam::uin/1001:uin/1001",id="qcs::cam::uin/1002:uin/1002"',
        // GrantWrite: 'id="qcs::cam::uin/1001:uin/1001",id="qcs::cam::uin/1002:uin/1002"',
        // GrantRead: 'id="qcs::cam::uin/1001:uin/1001",id="qcs::cam::uin/1002:uin/1002"',
        // ACL: 'public-read-write',
        // ACL: 'public-read',
        // ACL: 'private',
        ACL: 'default', // 继承上一级目录权限
        // AccessControlPolicy: {
        //     "Owner": { // AccessControlPolicy 里必须有 owner
        //         "ID": 'qcs::cam::uin/10001:uin/10001' // 10001 是 Bucket 所属用户的 QQ 号
        //     },
        //     "Grants": [{
        //         "Grantee": {
        //             "ID": "qcs::cam::uin/10002:uin/10002", // 10002 是 QQ 号
        //         },
        //         "Permission": "READ"
        //     }]
        // }
    }, function (err, data) {
        logger.log('putObjectAcl:', err || data);
    });
}

function getObjectAcl() {
    cos.getObjectAcl({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1mb.zip'
    }, function (err, data) {
        logger.log('getObjectAcl:', err || data);
    });
}

function deleteObject() {
    cos.deleteObject({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1mb.zip'
    }, function (err, data) {
        logger.log('deleteObject:', err || data);
    });
}

function deleteMultipleObject() {
    cos.deleteMultipleObject({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Objects: [
            {Key: '中文/中文.txt'},
            {Key: '中文/中文.zip',VersionId: 'MTg0NDY3NDI1MzM4NzM0ODA2MTI'},
        ]
    }, function (err, data) {
        logger.log('deleteMultipleObject:', err || data);
    });
}

function restoreObject() {
    cos.restoreObject({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1.txt',
        RestoreRequest: {
            Days: 1,
            CASJobParameters: {
                Tier: 'Expedited'
            }
        }
    }, function (err, data) {
        logger.log('restoreObject:', err || data);
    });
}

function selectObjectContent() {
    // 查询 CSV
    cos.selectObjectContent({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1.csv',
        SelectType: 2,
        SelectRequest: {
            Expression: "Select * from COSObject",
            ExpressionType: "SQL",
            InputSerialization: {
                CSV: {
                    FileHeaderInfo: "IGNORE",
                    RecordDelimiter: "\\n",
                    FieldDelimiter: ",",
                    QuoteCharacter: "\"",
                    QuoteEscapeCharacter: "\"",
                    Comments: "#",
                    AllowQuotedRecordDelimiter: "FALSE"
                }
            },
            OutputSerialization: {
                CSV: {
                    QuoteFields: "ASNEEDED",
                    RecordDelimiter: "\\n",
                    FieldDelimiter: ",",
                    QuoteCharacter: "\"",
                    QuoteEscapeCharacter: "\""
                }
            },
            RequestProgress: {
                Enabled: "FALSE"
            }
        },
    }, function (err, data) {
        logger.log('selectObjectContent:', err || data);
    });
    // 查询 JSON
    cos.selectObjectContent({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '1.json',
        SelectType: 2,
        SelectRequest: {
            Expression: "Select b from COSObject",
            ExpressionType: "SQL",
            InputSerialization: {
                JSON: {
                    Type: "DOCUMENT",
                },
            },
            OutputSerialization: {
                JSON: {
                    RecordDelimiter: "\n"
                },
            },
            RequestProgress: {
                Enabled: "FALSE"
            }
        },
    }, function (err, data) {
        logger.log('selectObjectContent:', err || data);
    });
}

function abortUploadTask() {
    cos.abortUploadTask({
        Bucket: config.Bucket, /* 必须 */ // Bucket 格式：test-1250000000
        Region: config.Region, /* 必须 */
        // 格式1，删除单个上传任务
        // Level: 'task',
        // Key: '10mb.zip',
        // UploadId: '14985543913e4e2642e31db217b9a1a3d9b3cd6cf62abfda23372c8d36ffa38585492681e3',
        // 格式2，删除单个文件所有未完成上传任务
        Level: 'file',
        Key: '10mb.zip',
        // 格式3，删除 Bucket 下所有未完成上传任务
        // Level: 'bucket',
    }, function (err, data) {
        logger.log('abortUploadTask:', err || data);
    });
}

function uploadFile() {
    var filename = '10mb.zip';
    var blob = util.createFile({size: 1024 * 1024 * 10});
    cos.uploadFile({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: filename,
        Body: blob,
        SliceSize: 1024 * 1024 * 5, // 大于5mb才进行分块上传
        onProgress: function (info) {
            var percent = Math.floor(info.percent * 10000) / 100;
            var speed = Math.floor(info.speed / 1024 / 1024 * 100) / 100;
            logger.log('进度：' + percent + '%; 速度：' + speed + 'Mb/s;');
        },
    }, function (err, data) {
        logger.log('上传' + (err ? '失败' : '完成'));
        logger.log('uploadFile:', err || data);
    });
}

function sliceUploadFile() {
    var blob = util.createFile({size: 1024 * 1024 * 3});
    cos.sliceUploadFile({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: '3mb.zip', /* 必须 */
        Body: blob,
        Headers: {
            // 万象持久化接口，上传时持久化
            // 'Pic-Operations': '{"is_pic_info": 1, "rules": [{"fileid": "test.jpg", "rule": "imageMogr2/thumbnail/!50p"}]}'
        },
        onTaskReady: function (tid) {
            TaskId = tid;
        },
        onHashProgress: function (progressData) {
            logger.log('onHashProgress', JSON.stringify(progressData));
        },
        onProgress: function (progressData) {
            logger.log('onProgress', JSON.stringify(progressData));
        },
    }, function (err, data) {
        logger.log('sliceUploadFile:', err || data);
    });
}

function selectFileToUpload() {
    util.selectLocalFile(function (files) {
        var file = files && files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
            cos.sliceUploadFile({
                Bucket: config.Bucket, // Bucket 格式：test-1250000000
                Region: config.Region,
                Key: file.name,
                Body: file,
                onTaskReady: function (tid) {
                    TaskId = tid;
                },
                onHashProgress: function (progressData) {
                    logger.log('onHashProgress', JSON.stringify(progressData));
                },
                onProgress: function (progressData) {
                    logger.log('onProgress', JSON.stringify(progressData));
                },
            }, function (err, data) {
                logger.log('selectFileToUpload:', err || data);
            });
        } else {
            cos.putObject({
                Bucket: config.Bucket, // Bucket 格式：test-1250000000
                Region: config.Region,
                Key: file.name,
                Body: file,
                onTaskReady: function (tid) {
                    TaskId = tid;
                },
                onHashProgress: function (progressData) {
                    logger.log('onHashProgress', JSON.stringify(progressData));
                },
                onProgress: function (progressData) {
                    logger.log(JSON.stringify(progressData));
                },
            }, function (err, data) {
                logger.log('selectFileToUpload:', err || data);
            });
        }
    });
}

function cancelTask() {
    cos.cancelTask(TaskId);
    logger.log('canceled');
}

function pauseTask() {
    cos.pauseTask(TaskId);
    logger.log('paused');
}

function restartTask() {
    cos.restartTask(TaskId);
    logger.log('restart');
}

function uploadFiles() {
    var filename = 'mb.zip';
    var blob = util.createFile({size: 1024 * 1024 * 10});
    cos.uploadFiles({
        files: [{
            Bucket: config.Bucket, // Bucket 格式：test-1250000000
            Region: config.Region,
            Key: '1' + filename,
            Body: blob,
        }, {
            Bucket: config.Bucket, // Bucket 格式：test-1250000000
            Region: config.Region,
            Key: '2' + filename,
            Body: blob,
        }, {
            Bucket: config.Bucket, // Bucket 格式：test-1250000000
            Region: config.Region,
            Key: '3' + filename,
            Body: blob,
        }],
        SliceSize: 1024 * 1024,
        onProgress: function (info) {
            var percent = Math.floor(info.percent * 10000) / 100;
            var speed = Math.floor(info.speed / 1024 / 1024 * 100) / 100;
            logger.log('进度：' + percent + '%; 速度：' + speed + 'Mb/s;');
        },
        onFileFinish: function (err, data, options) {
            logger.log(options.Key + ' 上传' + (err ? '失败' : '完成'));
        },
    }, function (err, data) {
        logger.log('uploadFiles:', err || data);
    });
}

function sliceCopyFile() {
    // 创建测试文件
    var sourceName = '3mb.zip';
    var Key = '3mb.copy.zip';

    var sourcePath = config.Bucket + '.cos.' + config.Region + '.myqcloud.com/'+ camSafeUrlEncode(sourceName).replace(/%2F/g, '/');

    cos.sliceCopyFile({
        Bucket: config.Bucket, // Bucket 格式：test-1250000000
        Region: config.Region,
        Key: Key,
        CopySource: sourcePath,
        SliceSize: 2 * 1024 * 1024, // 大于2M的文件用分片复制，小于则用单片复制
        onProgress:function (info) {
            var percent = Math.floor(info.percent * 10000) / 100;
            var speed = Math.floor(info.speed / 1024 / 1024 * 100) / 100;
            logger.log('进度：' + percent + '%; 速度：' + speed + 'Mb/s;');
        }
    },function (err,data) {
        if(err){
            logger.log('sliceCopyFile:', err);
        }else{
            logger.log('sliceCopyFile:', data);
        }
    });
}

/* 移动对象*/
function moveObject() {
    // COS 没有对象重命名或移动的接口，移动对象可以通过复制/删除对象实现
    var source = 'source.txt';
    var target = 'target.txt';
    var copySource = config.Bucket + '.cos.' + config.Region + '.myqcloud.com/' + camSafeUrlEncode(source).replace(/%2F/g, '/');
    cos.putObject({
        Bucket: config.Bucket,
        Region: config.Region,
        Key: source,
        Body: 'hello!',
    }, function (err, data) {
        if (err) return logger.log(err);
        cos.putObjectCopy({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: target,
            CopySource: copySource,
        }, function (err, data) {
            if (err) return logger.log(err);
            cos.deleteObject({
                Bucket: config.Bucket,
                Region: config.Region,
                Key: source,
            }, function (err, data) {
                logger.log(err || data);
            });
        });
    });
}

/* 上传到指定文件夹/目录 */
function uploadToFolder() {
    util.selectLocalFile(function (files) {
        var file = files && files[0];
        if (!file) return;
        cos.putObject({
            Bucket: config.Bucket, // Bucket 格式：test-1250000000
            Region: config.Region,
            Key: 'folder/' + file.name,
            Body: file,
        }, function (err, data) {
            logger.log(err || data);
        });
    });
}

/* 创建文件夹 */
function createFolder() {
    cos.putObject({
        Bucket: config.Bucket,
        Region: config.Region,
        Key: 'folder/', // 对象存储没有实际的文件夹，可以创建一个路径以 / 结尾的空对象表示，能在部分场景中满足文件夹使用需要
        Body: '',
    }, function(err, data) {
        logger.log(err || data);
    });
}

/* 上传本地文件夹 */
function uploadFolder() {
    // <input type='file' name="file" webkitdirectory >
    var input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.onchange = function(){
        var oFiles = input.files;
        if (!oFiles.length) return;
        var files = [];
        for (var i = 0; i < oFiles.length; i++) {
            var file = oFiles[i];
            var Key = 'folder/' + file.webkitRelativePath;
            files.push({
                Bucket: config.Bucket, // Bucket 格式：test-1250000000
                Region: config.Region,
                Key: Key,
                Body: file,
            });
        }
        cos.uploadFiles({
            files: files,
            SliceSize: 1024 * 1024,
            onProgress: function (info) {
                var percent = Math.floor(info.percent * 10000) / 100;
                var speed = Math.floor(info.speed / 1024 / 1024 * 100) / 100;
                logger.log('进度：' + percent + '%; 速度：' + speed + 'Mb/s;');
            },
            onFileFinish: function (err, data, options) {
                logger.log(options.Key + ' 上传' + (err ? '失败' : '完成'));
            },
        }, function (err, data) {
            logger.log('uploadFolder:', err || data);
        });
    };
    input.click();
}

/* 列出文件夹下的文件 */
function listFolder() {
    var _listFolder = function(params, callback) {
        var Contents = [];
        var CommonPrefixes = [];
        var marker;
        var next = function() {
            params.Marker = marker;
            cos.getBucket(params, function(err, data) {
                if (err) return callback(err);
                data && data.CommonPrefixes && data.CommonPrefixes.forEach(function (item) {
                    CommonPrefixes.push(item);
                });
                data && data.Contents && data.Contents.forEach(function (item) {
                    Contents.push(item);
                });
                if (data.IsTruncated === 'true') {
                    marker = data.NextMarker;
                    next();
                } else {
                    callback(null, {
                        CommonPrefixes: CommonPrefixes,
                        Contents: Contents,
                    });
                }
            });
        };
        next();
    };
    _listFolder({
        Bucket: config.Bucket,
        Region: config.Region,
        Delimiter: '/', // 如果按目录列出文件传入该分隔符，如果要深度列出文件不传改参数
        Prefix: 'folder/', // 要列出的目录前缀
    }, function (err, data) {
        logger.log('listFolder:', err || data);
    });
}

/* 删除指定文件夹下的所有对象（删除存储桶里指定前缀所有对象） */
function deleteFolder() {
    var _deleteFolder = function(params, callback) {
        var deletedList = [];
        var errorList = [];
        var marker;
        var next = function() {
            params.Marker = marker;
            cos.getBucket(params, function(err, data) {
                if (err) return callback(err);
                var Objects = [];
                if (data && data.Contents && data.Contents.length) {
                    data.Contents.forEach(function (item) {
                        Objects.push({Key: item.Key});
                    });
                }
                var afterDeleted = function () {
                    if (data.IsTruncated === 'true') {
                        marker = data.NextMarker;
                        next();
                    } else {
                        callback(null, { Deleted: deletedList, Error: errorList });
                    }
                };
                if (Objects.length) {
                    cos.deleteMultipleObject({
                        Bucket: params.Bucket,
                        Region: params.Region,
                        Objects: Objects,
                    }, function (err, data) {
                        data.Deleted && data.Deleted.forEach(function (item) {
                            deletedList.push(item);
                        });
                        data.Error && data.Error.forEach(function (item) {
                            errorList.push(item);
                        });
                        afterDeleted();
                    });
                } else {
                    afterDeleted();
                }
            });
        };
        next();
    };
    _deleteFolder({
        Bucket: config.Bucket,
        Region: config.Region,
        Prefix: 'folder/', // 要列出的目录前缀
    }, function (err, data) {
        logger.log('deleteFolder:', err || data);
    });
}

function request() {
    cos.request({
        Bucket: config.Bucket,
        Region: config.Region,
        Key: '1.png',
        Method: 'POST',
        Action: 'image_process',
        Headers: {
        // 通过 imageMogr2 接口使用图片缩放功能：指定图片宽度为 200，宽度等比压缩
            'Pic-Operations': '{"is_pic_info": 1, "rules": [{"fileid": "desample_photo.jpg", "rule": "imageMogr2/thumbnail/200x/"}]}'
        },
    }, function (err, data) {
        logger.log('request:', err || data);
    });
}

function CIExample1(){
    util.selectLocalFile(function (files) {
        var file = files && files[0];
        if (!file) return;
        if(file.type.indexOf('image') < 0){
            logger.error('Please select a photo to upload!');
            return;
        }
        if (file.size > 1024 * 1024) {
            cos.sliceUploadFile({
                Bucket: config.Bucket, // Bucket 格式：test-1250000000
                Region: config.Region,
                Key: file.name,
                Body: file,
                Headers: {
                  // 通过 imageMogr2 接口使用图片缩放功能：指定图片宽度为 200，宽度等比压缩
                  'Pic-Operations':
                    '{"is_pic_info": 1, "rules": [{"fileid": "desample_photo.jpg", "rule": "imageMogr2/thumbnail/200x/"}]}',
                },
                onTaskReady: function (tid) {
                    TaskId = tid;
                },
                onHashProgress: function (progressData) {
                    logger.log('onHashProgress', JSON.stringify(progressData));
                },
                onProgress: function (progressData) {
                    logger.log('onProgress', JSON.stringify(progressData));
                },
            }, function (err, data) {
                logger.log('CIExample1:', err || data);
            });
        } else {
            cos.putObject({
                Bucket: config.Bucket, // Bucket 格式：test-1250000000
                Region: config.Region,
                Key: file.name,
                Body: file,
                Headers: {
                  // 通过 imageMogr2 接口使用图片缩放功能：指定图片宽度为 200，宽度等比压缩
                  'Pic-Operations':
                    '{"is_pic_info": 1, "rules": [{"fileid": "desample_photo.jpg", "rule": "imageMogr2/thumbnail/200x/"}]}',
                },
                onTaskReady: function (tid) {
                    TaskId = tid;
                },
                onHashProgress: function (progressData) {
                    logger.log('onHashProgress', JSON.stringify(progressData));
                },
                onProgress: function (progressData) {
                    logger.log('onProgress', JSON.stringify(progressData));
                },
            }, function (err, data) {
                logger.log('CIExample1:', err || data);
            });
        }
    });
}
function CIExample2(){
    cos.request({
        Bucket: config.Bucket,
        Region: config.Region,
        Key: 'photo.png',
        Method: 'POST',
        Action: 'image_process',
        Headers: {
        // 通过 imageMogr2 接口使用图片缩放功能：指定图片宽度为 200，宽度等比压缩
            'Pic-Operations': '{"is_pic_info": 1, "rules": [{"fileid": "desample_photo.jpg", "rule": "imageMogr2/thumbnail/200x/"}]}'
        },
    }, function (err, data) {
        logger.log('CIExample2:', err || data);
    });
}
function CIExample3(){
    cos.getObject({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: 'photo.png',
            QueryString: `imageMogr2/thumbnail/200x/`,
        },
        function (err, data) {
            logger.log('CIExample3:', err || data);
        },
    );
}
function CIExample4(){

    // 生成带图片处理参数的文件签名URL，过期时间设置为 30 分钟。
    cos.getObjectUrl({
            Bucket: config.Bucket,
            Region: config.Region,
            Key: 'photo.png',
            QueryString: `imageMogr2/thumbnail/200x/`,
            Expires: 1800,
            Sign: true,
        },
        function (err, data) {
            logger.log('getObjectUrl with sign: ', err || data && data.Url);
        },
    );

  // 生成带图片处理参数的文件URL，不带签名。
  cos.getObjectUrl({
        Bucket: config.Bucket,
        Region: config.Region,
        Key: 'photo.png',
        QueryString: `imageMogr2/thumbnail/200x/`,
        Sign: false,
    },
    function (err, data) {
        logger.log('getObjectUrl without sign: ', err || data && data.Url);
    },
  );
}

// 查询已经开通数据万象功能的存储桶
function describeMediaBuckets() {
    var host = 'ci.' + config.Region + '.myqcloud.com';
    var url = 'https://' + host + '/mediabucket';
    cos.request({
        Bucket: config.Bucket,
        Region: config.Region,
        Method: 'GET',
        Key: 'mediabucket', /** 固定值，必须 */
        Url: url,
        Query: {
            pageNumber: '1', /** 第几页，非必须 */
            pageSize: '10', /** 每页个数，非必须 */
            // regions: 'ap-chengdu', /** 地域信息，例如'ap-beijing'，支持多个值用逗号分隔如'ap-shanghai,ap-beijing'，非必须 */
            // bucketNames: 'test-1250000000', /** 存储桶名称，精确搜索，例如'test-1250000000'，支持多个值用逗号分隔如'test1-1250000000,test2-1250000000'，非必须 */
            // bucketName: 'test', /** 存储桶名称前缀，前缀搜索，例如'test'，支持多个值用逗号分隔如'test1,test2'，非必须 */
        }
    }, function (err, data) {
        logger.log(err || data);
    });
}


// 获取媒体文件信息
function getMediaInfo() {
    cos.request({
        Bucket: config.Bucket,
        Region: config.Region,
        Method: 'GET',
        Key: 'test.mp4',
        Query: {
            'ci-process': 'videoinfo' /** 固定值，必须 */
        }
    }, function (err, data) {
        logger.log(err || data);
    });
}

// 获取媒体文件某个时间的截图
function getSnapshot() {
    cos.request({
        Bucket: config.Bucket,
        Region: config.Region,
        Method: 'GET',
        Key: 'test.mp4',
        Query: {
            'ci-process': 'snapshot', /** 固定值，必须 */
            time: 1, /** 截图的时间点，单位为秒，必须 */
            // width: 0, /** 截图的宽，非必须 */
            // height: 0, /** 截图的高，非必须 */
            // format: 'jpg', /** 截图的格式，支持 jpg 和 png，默认 jpg，非必须 */
            // rotate: 'auto', /** 图片旋转方式，默认为'auto'，非必须 */
            // mode: 'exactframe', /** 截帧方式，默认为'exactframe'，非必须 */
        },
        RawBody: true,
        // 可选返回文件格式为blob
        DataType: 'blob',
    },
    function(err, data){
        logger.log(err || data);
    });
}

// 图片同步审核
function getImageAuditing() {
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'GET',
      Key: '1.png',
      Query: {
          'ci-process': 'sensitive-content-recognition', /** 固定值，必须 */
          'biz-type': '', /** 审核类型，非必须 */
          'detect-type': 'porn,ads', /** 审核策略，不填写则使用默认策略，非必须 */
          'detect-url': '', /** 审核任意公网可访问的图片链接，非必须 */
          'interval': 5, /** 审核 GIF 动图时，每隔interval帧截取一帧，非必须 */
          'max-frames': 5,  /** 审核 GIF 动图时，最大截帧数，非必须 */
          'large-image-detect': '0', /** 是否需要压缩图片后再审核，非必须 */
      },
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 图片批量审核
function postImagesAuditing() {
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/image/auditing';
  var body = COS.util.json2xml({
    Request: {
      Input: [{
        Object: '1.png',
      }, {
        Object: '6.png',
      }],
      Conf: {
        BizType: '',
        DetectType: 'Porn'
      }
    }
  });
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'POST',
      Url: url,
      Key: '/image/auditing',
      ContentType: 'application/xml',
      Body: body
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 查询图片审核任务结果
function getImageAuditingResult() {
  var jobId = 'si8263213daf3711eca0d1525400d88xxx'; // jobId可以通过图片批量审核返回
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/image/auditing/' + jobId;
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'GET',
      Key: '/image/auditing/' + jobId,
      Url: url,
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 提交视频审核任务
function postVideoAuditing() {
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/video/auditing';
  var body = COS.util.json2xml({
    Request: {
      Input: {
        Object: '1.mp4',
      },
      Conf: {
        BizType: '',
        DetectType: 'Porn',
        Snapshot: {
          Count: 1000, // 视频截帧数量
        },
        DetectContent: 1, // 是否审核视频声音,0-只审核视频不审核声音；1-审核视频+声音
      }
    }
  });
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'POST',
      Url: url,
      Key: '/video/auditing',
      ContentType: 'application/xml',
      Body: body
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 查询视频审核任务结果
function getVideoAuditingResult() {
  var jobId = 'av14d9ca15af3a11eca0d6525400d88xxx'; // jobId可以通过提交视频审核任务返回
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/video/auditing/' + jobId;
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'GET',
      Key: '/video/auditing/' + jobId,
      Url: url,
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 提交音频审核任务
function postAudioAuditing() {
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/audio/auditing';
  var body = COS.util.json2xml({
    Request: {
      Input: {
        Object: '1.mp3',
      },
      Conf: {
        BizType: '',
        DetectType: 'Porn',
      }
    }
  });
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'POST',
      Url: url,
      Key: '/audio/auditing',
      ContentType: 'application/xml',
      Body: body
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 查询音频审核任务结果
function getAudioAuditingResult() {
  var jobId = 'sa0c28d41daff411ecb23352540078cxxx'; // jobId可以通过提交音频审核任务返回
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/audio/auditing/' + jobId;
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'GET',
      Key: '/audio/auditing/' + jobId,
      Url: url,
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 提交文本审核任务
function postTextAuditing() {
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/text/auditing';
  var body = COS.util.json2xml({
    Request: {
      Input: {
        // Object: 'hello.txt', // 存在cos里的资源，审核结果异步返回，可以调用查询文本审核结果api查询
        Content: '5Lmz5rKf', // 经过base64编码过的文本”乳沟“，查询结果同步返回
      },
      Conf: {
        BizType: '',
        DetectType: 'Porn',
      }
    }
  });
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'POST',
      Url: url,
      Key: '/text/auditing',
      ContentType: 'application/xml',
      Body: body
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 查询文本审核任务结果
function getTextAuditingResult() {
  var jobId = 'st8d88c664aff511ecb23352540078cxxx'; // jobId可以通过提交文本审核任务返回（Input传入Object）
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/text/auditing/' + jobId;
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'GET',
      Key: '/text/auditing/' + jobId,
      Url: url,
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 提交文档审核任务
function postDocumentAuditing() {
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/document/auditing';
  var body = COS.util.json2xml({
    Request: {
      Input: {
        Object: 'test.xlsx', // 存在cos里的资源，审核结果异步返回，可以调用查询文本审核结果api查询
      },
      Conf: {
        BizType: '',
        DetectType: 'Porn',
      }
    }
  });
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'POST',
      Url: url,
      Key: '/document/auditing',
      ContentType: 'application/xml',
      Body: body
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 查询文档审核任务结果
function getDocumentAuditingResult() {
  var jobId = 'sd7815c21caff611eca12f525400d88560'; // jobId可以通过提交文档审核任务返回
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/document/auditing/' + jobId;
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'GET',
      Key: '/document/auditing/' + jobId,
      Url: url,
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 提交网页审核任务
function postWebpageAuditing() {
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/webpage/auditing';
  var body = COS.util.json2xml({
    Request: {
      Input: {
        Url: 'https://cloud.tencent.com/', // 存在cos里的资源，审核结果异步返回，可以调用查询文本审核结果api查询
      },
      Conf: {
        BizType: '',
        DetectType: 'Porn,Ads',
      }
    }
  });
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'POST',
      Url: url,
      Key: '/webpage/auditing',
      ContentType: 'application/xml',
      Body: body
  },
  function(err, data){
      logger.log(err || data);
  });
}

// 查询网页审核任务结果
function getWebpageAuditingResult() {
  var jobId = 'shce868019aff611ecb1155254009a4xxx'; // jobId可以通过提交网页审核任务返回
  var host = config.Bucket + '.ci.' + config.Region + '.myqcloud.com';
  var url = 'https://' + host + '/webpage/auditing/' + jobId;
  cos.request({
      Bucket: config.Bucket,
      Region: config.Region,
      Method: 'GET',
      Key: '/webpage/auditing/' + jobId,
      Url: url,
  },
  function(err, data){
      logger.log(err || data);
  });
}


(function () {
    var list = [
        'header-工具函数',
        'request',
        'getObjectUrl',
        'getAuth',

        //'getService', // 不支持，正常场景会跨域
        'header-存储桶操作',
        //'putBucket', // 不支持，正常场景会跨域
        'headBucket',
        'putBucketAcl',
        'getBucketAcl',
        'putBucketCors',
        'getBucketCors',
        // 'deleteBucketCors', // 不建议调用，删除 CORS，浏览器不能正常调用
        'putBucketTagging',
        'getBucketTagging',
        'deleteBucketTagging',
        'putBucketPolicy',
        'getBucketPolicy',
        'deleteBucketPolicy',
        'getBucketLocation',
        'getBucketLifecycle',
        'putBucketLifecycle',
        'deleteBucketLifecycle',
        'putBucketVersioning',
        'getBucketVersioning',
        'getBucketReplication',
        'putBucketReplication',
        'deleteBucketReplication',
        'putBucketWebsite',
        'getBucketWebsite',
        'deleteBucketWebsite',
        'putBucketReferer',
        'getBucketReferer',
        'putBucketDomain',
        'getBucketDomain',
        'deleteBucketDomain',
        'putBucketLogging',
        'getBucketLogging',
        'deleteBucketLogging',
        'putBucketInventory',
        'getBucketInventory',
        'deleteBucketInventory',
        'listBucketInventory',
        'putBucketEncryption',
        'getBucketEncryption',
        'deleteBucketEncryption',
        'deleteBucket',

        'header-对象操作',
        'getBucket',
        'listObjectVersions',
        'putObjectCopy',
        'getObject',
        'headObject',
        'putObjectAcl',
        'getObjectAcl',
        'deleteObject',
        'deleteMultipleObject',
        'restoreObject',
        'abortUploadTask',
        'selectObjectContent',
        'putObject',
        'putObject_base64ToBlob',
        'appendObject',
        'appendObject_continue',

        'header-高级操作',
        'uploadFile',
        'sliceUploadFile',
        'selectFileToUpload',
        'sliceCopyFile',
        'uploadFiles',
        'uploadFolder',
        'uploadToFolder',
        'moveObject',
        'createFolder',
        'listFolder',
        'deleteFolder',
        'cancelTask',
        'pauseTask',
        'restartTask',

        'header-数据万象示例',
        'CIExample1',
        'CIExample2',
        'CIExample3',
        'CIExample4',
        'describeMediaBuckets',
        'getMediaInfo',
        'getSnapshot',
        'getImageAuditing',
        'postImagesAuditing',
        'getImageAuditingResult',
        'postVideoAuditing',
        'getVideoAuditingResult',
        'postAudioAuditing',
        'getAudioAuditingResult',
        'postTextAuditing',
        'getTextAuditingResult',
        'postDocumentAuditing',
        'getDocumentAuditingResult',
        'postWebpageAuditing',
        'getWebpageAuditingResult',
    ];
    var labelMap = {
        putObject: '简单上传',
        putObject_base64ToBlob: '简单上传：base64转blob',
        appendObject: '追加上传',
        appendObject_continue: '查询position并追加上传',
        uploadFile: '高级上传',
        sliceUploadFile: '分片上传',
        sliceCopyFile: '分片复制',
        uploadFiles: '批量上传文件',
        selectFileToUpload: '上传本地文件',
        uploadFolder: '上传文件夹',
        uploadToFolder: '上传到指定文件夹',
        request: '通用请求接口',
        listFolder: '列出文件夹',
        deleteFolder: '删除文件夹(按前缀批量删除)',
        CIExample1: '上传时使用图片处理',
        CIExample2: '对云上数据进行图片处理',
        CIExample3: '下载时使用图片处理',
        CIExample4: '生成带图片处理参数的签名 URL',
        describeMediaBuckets: '查询媒体处理开通情况',
        getMediaInfo: '获取媒体文件信息',
        getSnapshot: '获取媒体文件某个时间的截图',
        getImageAuditing: '图片同步审核',
        postImagesAuditing: '图片批量审核',
        getImageAuditingResult: '查询图片审核任务结果',
        postVideoAuditing: '提交视频审核任务',
        getVideoAuditingResult: '查询视频审核任务结果',
        postAudioAuditing: '提交音频审核任务',
        getAudioAuditingResult: '查询音频审核任务结果',
        postTextAuditing: '提交文本审核任务',
        getTextAuditingResult: '查询文本审核任务结果',
        postDocumentAuditing: '提交文档审核任务',
        getDocumentAuditingResult: '查询文档审核任务结果',
        postWebpageAuditing: '提交网页审核任务',
        getWebpageAuditingResult: '查询网页审核任务结果',
    };
    var container = document.querySelector('.main');
    var html = [];
    list.forEach(function (name) {
        if (name === '-') {
            html.push('<hr/>');
        } else if(name.indexOf('header') > -1){
            html.push('<h4>'+ name.split('-')[1] +'</h4>')
        } else {
            html.push('<a href="javascript:void(0)" data-method="' + name + '">' + name + (labelMap[name] ? ' (' + labelMap[name] + ')' : '') + '</a>');
        }
    });
    container.innerHTML = html.join('');
    container.onclick = function (e) {
        if (e.target.tagName === 'A') {
            var name = e.target.getAttribute('data-method').trim();
            window[name]();
        }
    };

    // 设置结果面板跟随窗口自适应高
    var mainPanel = document.querySelector('.main');
    var resultPanel = document.querySelector('.result');
    resultPanel.style.height = getPanelHeight();
    window.onresize = function(e){
        resultPanel.style.height = getPanelHeight();
    }

    function getPanelHeight(){
        return (mainPanel.getBoundingClientRect().height - 80) + 'px';
    }
})();
