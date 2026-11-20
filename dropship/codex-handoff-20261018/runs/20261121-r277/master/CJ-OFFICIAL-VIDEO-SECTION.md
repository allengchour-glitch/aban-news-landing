## [\#](https://developers.cjdropshipping.cn/en/api/api2/api/product.html\#_6-video) 6 Video\
\
### [\#](https://developers.cjdropshipping.cn/en/api/api2/api/product.html\#_6-1-query-product-videos-post) 6.1 Query Product Videos (POST)\
\
Note\
\
It is recommended that customers cache videos on their own servers instead of using CJ video URLs directly for end users. Heavy direct usage of CJ video playback URLs may affect service stability and could be rate-limited.\
\
Important\
\
When downloading videos, you **must** include a `Referer` header with the value `https://developers.cjdropshipping.com/` in your request, otherwise the video server will reject the request.\
\
Example:\
\
```text\
curl -H "Referer: https://developers.cjdropshipping.com" -O "https://download-only-api.cjdropshipping.com/xxxxxx/video.mp4"\
```\
\
#### [\#](https://developers.cjdropshipping.cn/en/api/api2/api/product.html\#url-26) URL\
\
https://developers.cjdropshipping.com/api2.0/v1/product/queryVideosByProductId\
\
#### [\#](https://developers.cjdropshipping.cn/en/api/api2/api/product.html\#curl-26) CURL\
\
```text\
curl --location 'https://developers.cjdropshipping.com/api2.0/v1/product/queryVideosByProductId' \\
--header 'CJ-Access-Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \\
--header 'Content-Type: application/json' \\
--data '{\
    "productId": "1658748072937136128"\
}'\
```\
\
#### [\#](https://developers.cjdropshipping.cn/en/api/api2/api/product.html\#request-parameters-10) Request Parameters\
\
| Parameter | Definition | Type | Required | Length | Note |\
| --- | --- | --- | --- | --- | --- |\
| productId | CJ Product Id | string | Y | 100 |  |\
\
#### [\#](https://developers.cjdropshipping.cn/en/api/api2/api/product.html\#return-26) Return\
\
success\
\
```json\
{\
    "success": true,\
    "code": 0,\
    "message": "success",\
    "data": [\
        {\
            "id": "abc39e6946dc4aa6b53f1813b53cfcb1",\
            "locProductId": "1964955178105954305",\
            "videoName": "123",\
            "videoState": "ON_STATE",\
            "videoUrl": "https://download-only-api.cjdropshipping.com/abc39e6946dc4aa6b53f1813b53cfcb1/xxxx.mp4",\
            "videoNumber": null,\
            "notCopyrightPrice": "",\
            "copyrightPrice": "",\
            "copyright": "1",\
            "isFree": "1",\
            "videoId": "abc39e6946dc4aa6b53f1813b53cfcb1",\
            "videoSize": "4689615",\
            "coverURL": "https://download-only-api.cjdropshipping.com/abc39e6946dc4aa6b53f1813b53cfcb1/snapshots/xxx.jpg",\
            "duration": 39.521,\
            "unit": "MB",\
            "flag": "0",\
            "isBuy": true,\
            "payType": null,\
            "playCount": 6543,\
            "collectCount": 26,\
            "downloadCount": 46,\
            "showCount": 734,\
            "shareNum": 12,\
            "likeNum": 19,\
            "commentCount": 0,\
            "buyCount": 0,\
            "videoType": 1,\
            "copyrightBuyType": 4,\
            "orderNum": 0,\
            "videoByOut": null,\
            "width": 960,\
            "height": 540,\
            "openIn": null\
        }\
    ],\
    "requestId": "6106699663484b45829410eb75b5a4b3"\
}\
```\
\
error\
\
```json\
{\
    "success": false,\
    "code": 1600100,\
    "message": "productId must be not empty",\
    "data": null,\
    "requestId": "ae543fd1-cdd7-4a61-974a-1340fea678c6"\
}\
```\
\
#### [\#](https://developers.cjdropshipping.cn/en/api/api2/api/product.html\#response-parameters) Response Parameters\
\
| Field | Definition | Type | Length | Note |\
| --- | --- | --- | --- | --- |\
| success | Success Flag | boolean | 1 |  |\
| code | Error Code | int | 20 | 0 on success, [Error Code Reference](https://developers.cjdropshipping.cn/en/api/api2/standard/ps-code.html) |\
| message | Response Message | string | 200 |  |\
| data | Video List | array |  | Business data |\
| requestId | Request Id | string | 48 | For log error tracking |\
\
#### [\#](https://developers.cjdropshipping.cn/en/api/api2/api/product.html\#data-field-description-2) data Field Description\
\
| Field | Definition | Type | Note |\
| --- | --- | --- | --- |\
| id | Video Id | string |  |\
| locProductId | Product Id | string |  |\
| videoName | Video Name | string |  |\
| videoState | Video Status | string | ON\_STATE: Listed, DOWN\_STATE: Unlisted, DELETE\_STATE: Deleted |\
| videoUrl | Video URL | string |  |\
| videoNumber | Video Number | string |  |\
| notCopyrightPrice | Temporary Use Price | string |  |\
| copyrightPrice | Permanent Use Price | string |  |\
| copyright | Copyright | string |  |\
| isFree | Is Free | string | 0: Paid, 1: Free |\
| videoId | Cloud Video ID | string |  |\
| videoSize | Video Size | string |  |\
| coverURL | Cover Image | string |  |\
| duration | Duration | float |  |\
| unit | Size Unit | string | M, kb |\
| flag | Flag | string |  |\
| isBuy | Is Purchased | boolean |  |\
| payType | Copyright Purchase Type | string | 0: Permanent, 1: Partial |\
| playCount | Play Count | integer |  |\
| collectCount | Collect Count | integer |  |\
| downloadCount | Download Count | integer |  |\
| showCount | Impression Count | integer |  |\
| shareNum | Share Count | integer |  |\
| likeNum | Like Count | integer |  |\
| commentCount | Comment Count | integer |  |\
| buyCount | Purchase Count | integer |  |\
| videoType | Video Type | integer | 0: Unboxing, 1: Marketing, 2: Review, 3: Quality Check, 4: Packing, 5: Actual Product Video |\
| copyrightBuyType | Copyright Purchase Status | integer | 1: Not Purchased/Free, 2: Permanent, 3: Partial, 4: Both |\
| orderNum | Sort Order | integer |  |\
| videoByOut | Is Bought Out | boolean | true: Bought Out, false: Not Bought Out |\
| width | Width | long | Pixels |\
| height | Height | long | Pixels |\
| openIn | Days Until Free | integer |  |\
\
←\
[2 Setting](https://developers.cjdropshipping.cn/en/api/api2/api/setting.html)[4 Storage](https://developers.cjdropshipping.cn/en/api/api2/api/storage.html)\
→
