(function () {
    $(document).ready(function() {
        require([
            "dojo",
            "esri/Color",
            "esri",
            "esri/map",
            "esri/toolbars/draw",
            "tdtlib/TDTVecLayer",
            "esri/geometry/Point",
            "esri/geometry/Polyline",
            "esri/geometry/Circle",
            "esri/layers/ArcGISDynamicMapServiceLayer",
            "esri/layers/FeatureLayer",
            "esri/SpatialReference",
            "esri/renderers/ClassBreaksRenderer",
            "esri/InfoTemplate",
            "dojo/_base/connect",
            "esri/graphic",
            "esri/layers/GraphicsLayer",
            "esri/graphicsUtils",
            "esri/symbols/SimpleMarkerSymbol",
            "esri/symbols/SimpleLineSymbol",
            "esri/symbols/SimpleFillSymbol",
            "esri/tasks/Geoprocessor",
            "esri/renderers/SimpleRenderer",
            "esri/tasks/query",
            "dojo/domReady!"
        ],
        function (
            dojo,
            Color,
            esri,
            Map,
            Draw,
            TDTVecLayer,
            Point,
            Polyline,
            Circle,
            ArcGISDynamicMapServiceLayer,
            FeatureLayer,
            SpatialReference,
            ClassBreaksRenderer,
            InfoTemplate,
            connect,
            Graphic,
            GraphicsLayer,
            GraphicsUtils,
            SimpleMarkerSymbol,
            SimpleLineSymbol,
            SimpleFillSymbol,
            Geoprocessor,
            SimpleRenderer,
            Query
        ) {
            // 地图
            var map;

            var gp;

            var gl;

            var gf;

            var hotelLayer, hexagonLayer,streetLayer,sightsoptLayer,traceLayer,tracePointLayer;

            var hotel = null;

            var baseinfoList = null;

            var toolbar;

            // 被选择的要素
            var selectedFeatures = null;

            var drawnGeometry = null;

            // 模式标识,指示当前页面打开的功能
            var MODE_FLAG;

            /////////////
            //初始化页面
            (function () {
                // 地图容器控制
                function resolveFullHeight() {
                    $("#fullHeight").css("height", "auto");
                    var screenHight = $(window).height();
                    var navbarHight = $("#navbar").height();
                    var fullHeight = screenHight - navbarHight;
                    $("#fullHeight").height(fullHeight);
                }

                resolveFullHeight();

                $(window).resize(function () {
                    resolveFullHeight();
                });
                // 左侧面板弹进弹出
                (function () {
                    $("#menu-toggle").click(function (e) {
                        e.preventDefault();
                        $("#wrapper").toggleClass("toggled");
                        map.resize();
                    });
                })();
                // 时间选择器
                $('.input-daterange input').each(function () {
                    $(this).datepicker({
                        language: 'zh-CN',
                        autoclose: true,
                        todayHighlight: true
                    });
                });
            })();

            ////////////////
            //初始化地图
            (function () {
                map = new Map("map",{
                    logo: false
                });
                // 添加天地图底图
                var imgMap = new TDTVecLayer();
                map.addLayer(imgMap);

                var pt = new Point(118.79100, 32.038500);
                map.centerAndZoom(pt, 9);

                // 酒店图层
                hotelLayer = new FeatureLayer(serverDomain + hotelUrl, {
                    mode: FeatureLayer.MODE_SNAPSHOT,
                    outFields: ["*"],
                });
                // 酒店符号
                var hotelSymbol = new SimpleMarkerSymbol(
                    SimpleMarkerSymbol.STYLE_CIRCLE,
                    12,
                    new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_NULL,
                    new Color([247, 34, 101, 0.9]),
                    1
                    ),
                    new Color([207, 34, 171, 0.5])
                );
                hotelLayer.setRenderer(new SimpleRenderer(hotelSymbol));

                sightsoptLayer = new FeatureLayer(serverDomain + sightspotUrl, {
                    mode: FeatureLayer.MODE_SNAPSHOT,
                    outFields: ["*"],
                });
                // 酒店符号
                var sightsoptSymbol = new SimpleMarkerSymbol(
                    SimpleMarkerSymbol.STYLE_CIRCLE,
                    12,
                    new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_NULL,
                    new Color([247, 34, 101, 0.9]),
                    1
                    ),
                    new Color([230, 255, 0, 1])
                );
                sightsoptLayer.setRenderer(new SimpleRenderer(sightsoptSymbol));
                sightsoptLayer.hide();

                // 蜂窝多变形数据存放图层
                hexagonLayer = new GraphicsLayer();

                // 设置图层的渲染模式为分类渲染
                var symbol = new SimpleFillSymbol();
                symbol.setColor(new Color([150, 150, 150, 0.8]));
                var renderer = new ClassBreaksRenderer(symbol, "count_");
                renderer.addBreak(0, 6, new SimpleFillSymbol().setColor(new Color([56, 168, 0, 0.8])));
                renderer.addBreak(6, 14, new SimpleFillSymbol().setColor(new Color([102, 191, 0, 0.8])));
                renderer.addBreak(14, 27, new SimpleFillSymbol().setColor(new Color([155, 217, 0, 0.8])));
                renderer.addBreak(27, 46, new SimpleFillSymbol().setColor(new Color([222, 242, 0, 0.8])));
                renderer.addBreak(46, 117, new SimpleFillSymbol().setColor(new Color([255, 141, 0, 0.8])));
                renderer.addBreak(117, 297, new SimpleFillSymbol().setColor(new Color([255, 110, 0, 0.8])));
                renderer.addBreak(297, 517, new SimpleFillSymbol().setColor(new Color([255, 72, 0, 0.8])));
                renderer.addBreak(517, Infinity, new SimpleFillSymbol().setColor(new Color([255, 0, 0, 0.8])));
                hexagonLayer.setRenderer(renderer);

                gl = new GraphicsLayer({ id: "pointLayer" });
                map.addLayer(gl);
                gf = new GraphicsLayer({id:"FillLayer"});
                map.addLayer(gf);
                traceLayer = new GraphicsLayer();
                map.addLayer(traceLayer);
                
                
                // 添加酒店要素图层
                map.addLayer(hotelLayer);
                // 添加景点要素图层
                map.addLayer(sightsoptLayer);

                tracePointLayer = new GraphicsLayer();
                tracePointLayer.hide();
                map.addLayer(tracePointLayer);
                // 蜂窝六边形图层
                map.addLayer(hexagonLayer);

                
            })();

            /////////////
            // 初始化行为
            (function() {
                // 设置页面标识
                var flag = getFlag(GetArgsFromHref(window.location.href, "mode"));
                setModeFlag(flag);
                // 创建绘图器
                createToolbar(map);
                // 绑定点击事件
                connect.connect(hotelLayer, "onClick", graphicOnClick);
                
            })();

            /**
	         * 创建绘制工具
	         */
            function createToolbar(themap) {
                toolbar = new Draw(themap);
                toolbar.on("draw-end", drawEnd);
            }
            
            /**
	         * 几何绘制完成事件
	         */
            function drawEnd(evt) {
                // 关闭绘制
                toolbar.deactivate();
                drawnGeometry = evt.geometry;
                console.log(JSON.stringify(drawnGeometry.rings[0]));
                var symbol = new SimpleFillSymbol();
                map.showZoomSlider();
                var graphic = new Graphic(evt.geometry, symbol);
                hexagonLayer.add(graphic);
                // 根据绘制区域查询hotelLayer,将范围内的要素存放到全局变量selectedFeatures中
                var query = new Query();
                query.geometry = evt.geometry;
                hotelLayer.queryFeatures(query, function(response) {
                    selectedFeatures = response.features;
                });
            }

            /**
             * 几何点击事件：根据标识触发行为
             */
            function graphicOnClick(evt) {
                hotel = evt.graphic;
                setBaseinfoList();
                switch (MODE_FLAG) {
                    case "HOTEL_SENTIMENT": //基本信息功能
                        updateAndSetOption();
                        break;
                    case "HISTORY_TREND": //历史趋势功能
                        setTrendChart();
                        break;
                }
            }

            /**
             * 设置当前点击酒店的基本信息
             */
            function setBaseinfoList() {
                var paramStr = "?location_id=" + hotel.attributes["guid"];
                $.ajax({
                    type: "get",
                    async: false, // 异步
                    url: domain + getBaseinfoUrl + paramStr,
                    dataType: "json",
                    timeout: 5000,
                    success: function (result) {
                        if (result.length > 0)
                            baseinfoList = result[0];
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                    }
                });
            }

            /**
             * 根据选择的OTA获取当前点击酒店的基本信息（OTA选择功能暂缺，目前优先返回携程的baseinfo）
             */
            function getBaseinfo(infoList) {
                if (infoList == null) {
                    alert("请先选择酒店");
                    return null;
                }
                
                if (infoList.length != 0) {
                    for (var i = 0; i < infoList.length; i++) {
                        if (infoList[i]["ota"] == "携程") {
                            return infoList[i];
                        }
                    }
                    return infoList[0];
                }
                return null;
            }

            /**
             * 设置历史趋势图表
             */
            function setTrendChart() {
                var myChart = echarts.init(document.getElementById("trendChart"));
                myChart.setOption(treandChart_option);
            }


            /**
            * 更新图表设置
            */
            function updateAndSetOption() {
                updateAndSetSentimentChart("sentiment-table");
                updateAndSetReviewPie("review-rate");
                updateAndSetWordCloud("word-cloud");
            }

            /**
            * 更新数据并加载情感图表
            * @param   container   String   容器，放置情感图表
            */
            function updateAndSetSentimentChart(container) {
                var baseinfo = getBaseinfo(baseinfoList);
                var paramStr = "?baseinfo_id=" + baseinfo["id"];
                sentiment_option["yAxis"][0]["data"] = [];
                sentiment_option["series"][0]["data"] = [];
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getViewpoint + paramStr,
                    dataType: "json",
                    timeout: 5000,
                    success: function (result) {
                        if (result.length > 0) {
                            result = result[0]["viewpoint"];
                            var i = 0;
                            for (var key in result) {
                                i++;
                                sentiment_option["yAxis"][0]["data"].push(key);
                                if (result[key] > 0.5) {
                                    sentiment_option["series"][0]["data"].push((result[key] - 0.5).toFixed(2));
                                } else {
                                    sentiment_option["series"][0]["data"].push({ value: (result[key] - 0.5).toFixed(2), itemStyle: labelRight });
                                }
                                if (i > 10) {
                                    break;
                                }
                            }
                            loadSentimentChart(container);
                        }
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
            }

            /**
            * 更新数据并加载评论类型饼图
            * @param   container   String   容器，放置评论类型饼图
            */
            function updateAndSetReviewPie(container) {
                var baseinfo = getBaseinfo(baseinfoList);
                var paramStr = "?baseinfo_id=" + baseinfo["id"] + "&ota=" + baseinfo["ota"];
                reviewPie_option["series"][0]["data"] = [];
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getCommTypeNum + paramStr,
                    dataType: "json",
                    timeout: 5000,
                    success: function (result) {
                        if (result.length > 0) {
                            for (var x = 0; x < result.length; x++) {
                                reviewPie_option["series"][0]["data"].push({ "value": result[x][1], "name": result[x][0] });
                            }
                        }
                        loadReviewPie(container);
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                    }
                });
            }

            /**
            * 更新数据并加载形容词词云
            * @param   container   String   容器，放置评论类型饼图
            */
            function updateAndSetWordCloud(container) {
                var baseinfo = getBaseinfo(baseinfoList);
                var paramStr = "?baseinfo_id=" +baseinfo["id"];
                wordCloud_option["series"][0]["data"] = [];
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getAdjective + paramStr,
                    dataType: "json",
                    timeout: 5000,
                    success: function (result) {
                        var i = 0;
                        for (var key in result) {
                            i++;
                            if(result.length>30)
                                wordCloud_option["series"][0]["data"].push({ name: result[key][0], value: result[key][1], itemStyle: createRandomItemStyle() });
                            else {
                                wordCloud_option["series"][0]["data"].push({ name: result[key][0], value: result[key][1]*10, itemStyle: createRandomItemStyle() });
                            }
                            if (i > 30) {
                                break;
                            }
                        }
                        loadWordCloud(container);
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                    }
                });
            }


            /**
             * 获取数据绘制周边设施中最远距离设施为半径的圆
             */
            function draw_maxdistance_circular() {
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getMaxDistance,
                    dataType: "json",
                    timeout: 50000,
                    success: function (result) {
                        aroundmaxdistanceoption["series"][0]["data"] = [];
                        aroundmaxdistanceoption["xAxis"]["data"] = []

                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]<=100) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                            if (key < 1000) {
                                drwa_maxdistance_circular(result[key][0][1][0], result[key][0][1][1], result[key][1][1]);
                            }

                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>100&&result[key][1][1]<=200) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>200&&result[key][1][1]<=300) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>300&&result[key][1][1]<=400) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>400&&result[key][1][1]<=500) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>500&&result[key][1][1]<=600) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>600&&result[key][1][1]<=700) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>700&&result[key][1][1]<=800) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>800&&result[key][1][1]<=900) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>900&&result[key][1][1]<=1000) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        for (var key in result) {
                            if (key < 1500) {
                                if (result[key][1][1]>1000) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0])
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        loadaroundfac('zhoubiansheshi');
                        load_maxdistance('zuiyuanjvli');
                        map.centerAndZoom([118.7,32], 11);
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
            }


            /**
             * 绘制酒店位置为圆心最远距离设施为半径的圆
             * @param hotelX
             * @param hotelY
             * @param banjing
             */
            function drwa_maxdistance_circular(hotelX,hotelY,banjing){
                if (hotelX != 118.77807440803) {
                    if(hotelX != 118.77829690033) {
                        if (hotelX != 118.79560564853) {
                            if(hotelX != 118.79535319773) {
                                if(hotelX != 118.79157998222) {
                                    if (hotelX != 118.79189629625) {
                                        var pt = new Point(hotelX, hotelY, map.spatialReference);
                                        var symbol = new SimpleFillSymbol().setColor(null).outline.setColor("red");
                                        var circle = new Circle({
                                            center: pt,
                                            geodesic: true,
                                            radius: banjing
                                        });
                                        var graphic = new Graphic(circle, symbol);
                                        gl.add(graphic);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            //点击邻近分析按钮,绘制酒店与周边设施的连线
            $("#linjinfenxi").click(drawpoint);
            //点击最远设施按钮,绘制以最远设施为半径的范围
            $("#zuiyuansheshi").click(draw_maxdistance_circular);
            // 按钮-清除周边设施图层
            $("#qingchutuceng").click(function () {
                gl.clear();
            });

            /**
             * 获取数据绘制周边设施点
             */
            function drawpoint() {
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getArroudFacility,
                    dataType: "json",
                    timeout: 50000,
                    success: function (result) {

                        for (var key in result) {
                            for (var key2 in result[key][1])
                            {
                                //drwaPoint(result[key][1][key2][0],result[key][1][key2][1]);
                                drawLine(result[key][0][0],result[key][0][1],result[key][1][key2][0],result[key][1][key2][1]);
                            }
                        }
                        map.centerAndZoom([118.7,32], 11);
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
            }


            /**
             * 绘制酒店设施点符号
             * @param currentX
             * @param currentY
             */
            function drwaPoint(currentX,currentY){

                var pt = new Point(currentX,currentY,new SpatialReference({wkid:4326}));
                var symbol = new SimpleMarkerSymbol({
                    "color": [255,0,0],
                    "size": 4,
                    "angle": -30,
                    "xoffset": 0,
                    "yoffset": 0,
                    "type": "esriSMS",
                    "style": "esriSMSCircle",
                    "outline": {
                        "color": [0,0,0,255],
                        "width": 1,
                        "type": "esriSLS",
                        "style": "esriSLSSolid"}
                });
                var graphic = new Graphic(pt,symbol);
                gl.add(graphic);
                //map.centerAndZoom(pt, 17);
            }

            /**
             * 绘制酒店设施和酒店之间的线
             * @param hotelX
             * @param hotelY
             * @param currentX
             * @param currentY
             */
            function drawLine(hotelX,hotelY,currentX,currentY){
                var pt = new Polyline([[hotelX,hotelY],[currentX,currentY]],new SpatialReference({wkid:4326}));
                var symbol = new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_DASH,
                    new Color([138,43,226]),
                    1
                );
                var graphic = new Graphic(pt,symbol);
                gl.add(graphic);
            }


            /**
            * 加载酒店来源地图
            * @param   starttime   int   开始时间
            * @param   endtime     int   结束时间
            * @param   range       int   查询范围
            */
            function setCustomerMap(starttime, endtime, range) {
                var progressDiv = document.getElementById("cusProgressBar");
                var progBarEnd = false;
                var paramStr = "?lat=" + hotel.geometry.y + "&lng=" + hotel.geometry.x + "&starttime=" + starttime + "&endtime=" + endtime + "&range=" + range;
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getWeiboCome + paramStr,
                    dataType: "json",
                    timeout: 100000,
                    success: function (result) {
                        console.log("获取数据");
                        progressDiv.style.cssText = 'width:100%;';
                        progBarEnd = true;
                        // 两秒后加载地图
                        setTimeout(function() {
                            // 设置模态框内容为客源地图模态框
                            document.getElementById("customer_dialog").innerHTML = document.getElementById("customerMap_temp").innerHTML;
                            traceMapOption['options'] = [];
                            traceMapOption['timeline']['data'] = [];
                            for (year in result["city_counter"]) {
                                var annualMapOption = deepClone(mapOption);
                                annualMapOption['title']['text'] = hotel.attributes["hotel_name"];
                                traceMapOption['timeline']['data'].push(year);
                                for (var item in result["city_counter"][year]) {
                                    var line = new Array();
                                    // 起点
                                    var start = {
                                        'name': hotel.attributes["hotel_name"],
                                        'geoCoord': [hotel.geometry.x, hotel.geometry.y]
                                    };
                                    var end = {
                                        'name': item,
                                        'geoCoord': [result["city_location"][item]["x"], result["city_location"][item]["y"]],
                                        'value': result["city_counter"][year][item]
                                    };
                                    line.push(start);
                                    line.push(end);
                                    annualMapOption['series'][0]['markLine']['data'].push(line);
                                    annualMapOption['series'][0]['markPoint']['data'].push(end);
                                }
                                traceMapOption['options'].push(annualMapOption);
                            }
                            var myChart = echarts.init(document.getElementById("customerMap"));
                            myChart.setOption(traceMapOption);

                            // 按钮-设置用户画像
                            $("#btn_customerMap").click(function () {
                                document.getElementById("cusMap_container").innerHTML = "<div id='customerMap'></div>";
                                echarts.init(document.getElementById("customerMap")).setOption(traceMapOption);
                            });
                            // 按钮-用户信息
                            $("#btn_customerInfo").click(function () {
                                genderPie_option["series"][0]["data"] = [];
                                document.getElementById("cusMap_container").innerHTML = "<div id='genderPie'></div>";
                                var genderCounter = {"male":0,"female":0}
                                for (var i in result["weibo_info"]) {
                                    if (result["weibo_info"][i]["user"]["gender"] == "m")
                                        genderCounter["male"]++;
                                    else
                                        genderCounter["female"]++;
                                }
                                genderPie_option["series"][0]["data"].push({ "value": genderCounter["male"], "name": "男" });
                                genderPie_option["series"][0]["data"].push({ "value": genderCounter["female"], "name": "女" });
                                echarts.init(document.getElementById("genderPie")).setOption(genderPie_option);
                            });
                            // 按钮-用户轨迹
                            $("#btn_customerTrace").click(function () {
                                // 设置模态框内容为进度条
                                document.getElementById("customer_dialog").innerHTML = document.getElementById("customerProgress_temp").innerHTML;
                                var progBarEnd1 = false;
                                var progressDiv1 = document.getElementById("cusProgressBar");
                                // 取出id作为字典的key（去重）
                                var idDict = {};
                                for (var i in result["weibo_info"]) {
                                    idDict[result["weibo_info"][i]["user"]["id"]] = null;
                                }
                                // id放置到idArray中
                                var idArray = [];
                                for (var key in idDict) {
                                    idArray.push(key);
                                }
                                var paramStr1 = "?id=" + idArray.join();
                                $.ajax({
                                    type: "get",
                                    async: true, // 异步
                                    url: domain + getWeiboTrace + paramStr1,
                                    dataType: "json",
                                    timeout: 100000,
                                    success: function (result1) {
                                        progressDiv1.style.cssText = 'width:100%;';
                                        progBarEnd1 = true;
                                        setTimeout(function() {
                                            // 设置模态框内容为客源地图模态框
                                            document.getElementById("customer_dialog").innerHTML = document.getElementById("customerMap_temp").innerHTML;
                                            var annualMapOption1 = deepClone(mapOption);
                                            annualMapOption1["series"][0]["mapType"] = 'world';
                                            // 设置线
                                            for (var x in result1["line"]) {
                                                annualMapOption1['series'][0]['markLine']['data'].push(result1["line"][x]);
                                            }
                                            // 设置点
                                            for (var y in result1["point"]) {
                                                annualMapOption1['series'][0]['markPoint']['data'].push(result1["point"][y]);
                                            }
                                            echarts.init(document.getElementById("customerMap")).setOption(annualMapOption1);
                                        },1500);
                                    },
                                    error: function (errorMsg) {
                                        console.log(errorMsg);
                                        alert("你输入的值有误,请输入完整参数或者重试");
                                    }
                                });
                                setTimeout(function () {
                                    if (!progBarEnd1) {
                                        progressDiv1.style.cssText = 'width:50%;';
                                        setTimeout(function () { if (!progBarEnd1) progressDiv1.style.cssText = 'width:70%;'; }, 2000);
                                    }
                                }, 2000);
                            });

                        },1500);
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
                setTimeout(function() {
                     if (!progBarEnd) {
                         progressDiv.style.cssText = 'width:50%;';
                         setTimeout(function () { if (!progBarEnd) progressDiv.style.cssText = 'width:70%;'; }, 2000);
                     }
                }, 2000);
                    
            }
            


            /**
            * 根据酒店和容器id加载情感图表
            * @param   container   String   容器，放置情感图表
            */
            function loadSentimentChart(container) {
                var myChart = echarts.init(document.getElementById(container));
                myChart.setOption(sentiment_option);
            }


            /**
            * 根据酒店和容器id加载词云
            * @param   container   String   容器，放置词云
            */
            function loadWordCloud( container) {
                var myChart = echarts.init(document.getElementById(container));
                myChart.setOption(wordCloud_option);
            }


            /**
            * 根据酒店和容器id加载评论饼图
            * @param   container   String   容器，放置评论饼图
            */
            function loadReviewPie(container) {
                var myChart = echarts.init(document.getElementById(container));
                myChart.setOption(reviewPie_option);
            }


            /**
             * 加载酒店周边设施最远距离分布图
             * @param container
             */
            function loadaroundfac(container){
                var myChart = echarts.init(document.getElementById(container));
                myChart.setOption(hotelfenbu_option);
            }

            /**
             * 加载酒店最远距离设施图表
             * @param container
             */
            function load_maxdistance(container){
                var myChart = echarts.init(document.getElementById(container));
                myChart.setOption(aroundmaxdistanceoption);
            }

            

            /**
            * 生成蜂窝六边形
            */
            function executeHexagonGp(width) {
                if (selectedFeatures == null) {
                    alert("请绘制查询区域");
                    return;
                }
                // 进度条
                var progressDiv = document.getElementById("bookProgressBar");
                progressDiv.style.cssText = 'width:5%;';
                $('#bookMapModal').modal('show');
                var progBarEnd = false;
                gp = new Geoprocessor(serverDomain + gpUrl);
                gp.setOutSpatialReference({
                    wkid: 4326
                });
                var featureset = new esri.tasks.FeatureSet();
                // 设置执行要素为选中的要素
                featureset.features = selectedFeatures;
                featureset.spatialReference = new esri.SpatialReference({ wkid: 102100 });
                var parms = {
                    "Feature_Set": featureset,
                    "Width": width
                };
                // 脚本执行完成时回调
                gp.submitJob(parms, function (result) {
                    progBarEnd = true;
                    progressDiv.style.cssText = 'width:100%;';
                    setTimeout(function () {
                        $('#bookMapModal').modal('hide');
                        var jobId = result.jobId;
                        var status = result.jobStatus;
                        if (status === esri.tasks.JobInfo.STATUS_SUCCEEDED) {
                            gp.getResultData(jobId, "Reusult_Hexagon", addResults);
                        }
                    }, 2000);
                });
                setTimeout(function () {
                    if (!progBarEnd) {
                        progressDiv.style.cssText = 'width:50%;';
                        setTimeout(function () { if (!progBarEnd) progressDiv.style.cssText = 'width:70%;'; }, 12000);
                    }
                }, 12000);
            }

            /**
            * 获取到该数据时回调
            */
            function addResults(results) {
                console.log(results);
                var features = results.value.features;
                var polySymbolRed = SimpleFillSymbol();
                polySymbolRed.setOutline(new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0, 0.5]), 1));
                polySymbolRed.setColor(new dojo.Color([255, 57, 0, 0.5]));
                for (var i = 0, length = features.length; i != length; ++i) {
                    hexagonLayer.add(features[i]);
                }
                var infotemplate = new InfoTemplate();
                infotemplate.setContent("<b>计数</b>:${count_)}");
                hexagonLayer.setInfoTemplate(infotemplate);
                map.setExtent(GraphicsUtils.graphicsExtent(hexagonLayer.graphics));
            }

            function addXiechengTrace() {
                // 进度条
                var progressDiv = document.getElementById("bookProgressBar");
                progressDiv.style.cssText = 'width:5%;';
                $('#bookMapModal').modal('show');
                var progBarEnd = false;

                var baseinfo = getBaseinfo(baseinfoList);
                var paramStr = "?baseinfo_id=" + baseinfo["id"] + "&ring_str=" + JSON.stringify(drawnGeometry.rings[0]);
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getHotelTrace + paramStr,
                    dataType: "json",
                    timeout: 50000,
                    success: function (result) {
                        progBarEnd = true;
                        progressDiv.style.cssText = 'width:100%;';
                        setTimeout(function () {
                            $('#bookMapModal').modal('hide');
                            hexagonLayer.clear();
                            for (var i = 0; i < result["line"].length; i++) {
                                var pl = new Polyline([[result["line"][i][0]["geoCoord"][0], result["line"][i][0]["geoCoord"][1]], [result["line"][i][1]["geoCoord"][0], result["line"][i][1]["geoCoord"][1]]], new SpatialReference({ wkid: 4326 }));
                                var symbol = new SimpleLineSymbol({
                                    color: new Color([0, 150, 255, 1  ]),
                                    width: 0.5
                            });
                                var graphic = new Graphic(pl, symbol);
                                traceLayer.add(graphic);
                            }

                            for (var key in result["point"]) {
                                var pt = new Point(result["point"][key]["geoCoord"][0], result["point"][key]["geoCoord"][1]);
                                var pSymbol = new SimpleMarkerSymbol(
                                    SimpleMarkerSymbol.STYLE_CIRCLE,
                                    5,
                                    new SimpleLineSymbol(
                                    SimpleLineSymbol.STYLE_NULL,
                                    new Color([247, 34, 101, 0.9]),
                                    1
                                    ),
                                    new Color([255, 0, 0, 1])
                                );
                                var pGraphic = new Graphic(pt, pSymbol);
                                tracePointLayer.add(pGraphic);
                            }
                        }, 2000);
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                    }
                });

                setTimeout(function () {
                    if (!progBarEnd) {
                        progressDiv.style.cssText = 'width:50%;';
                        setTimeout(function () { if (!progBarEnd) progressDiv.style.cssText = 'width:70%;'; }, 3000);
                    }
                }, 3000);
            }

            /**
            * 设置弹窗-切换功能标签时执行
            */
            function setInfoContent() {
                var infotemplate = new InfoTemplate();
                infotemplate.setTitle("<b>${hotel_name}</b>");
                switch(MODE_FLAG) {
                    case "PRICE_MINITOR":
                        infotemplate.setContent("<a href='javascript:void(0);' data-name='${hotel_name}' onclick='markerClick(this)'>添加</a><br/><b>评论数</b>:${comm_num}");

                    case "HOTEL_COMPARISON":
                        infotemplate.setContent("<a href='javascript:void(0);' data-name='${hotel_name}' onclick='markerClick(this)'>添加</a><br/><b>评论数</b>:${comm_num}");
                        break;
                    default:
                        infotemplate.setContent("<b>评论数</b>:${comm_num}");
                }
                hotelLayer.setInfoTemplate(infotemplate);
            }

            window.markerClick = function (e) {
                $("#tag-box").show();
                var hotelName = e.getAttribute("data-name");
                $('input.tagsinput').tagsinput('add', hotelName);
            }

            /**
            * 根据key值获取标识
            */
            function getFlag(key) {
                switch (key) {
                    case "":
                        return "HOTEL_SENTIMENT";
                    case "1":
                        return "HOTEL_SENTIMENT";
                    case "基本信息":
                        return "HOTEL_SENTIMENT";
                    case "酒店对比":
                        return "HOTEL_COMPARISON";
                    case "用户画像":
                        return "CUSTOMER_COME_FROM";
                    case "价格监控":
                        return "PRICE_MINITOR";
                    case "历史趋势":
                        return "HISTORY_TREND";
                    case "订房热度":
                        return "BOOK_MAP";
                    case "服务覆盖":
                        return "SERVICE_COVER";
                    case "城市情感":
                        return "CITY_SENTIMENT";
                    case "景点关联":
                        return "SIGHT_MAP";
                }
                return "";
            }

            /**
            * 设置当前的模式标识
            */
            function setModeFlag(flag) {
                MODE_FLAG = flag;
                // 当前模式标识被修改时,触发修改页面逻辑
                setMode();
            }

            function setMode() {
                switch (MODE_FLAG) {
                    case "HOTEL_SENTIMENT":
                        setInfoContent();
                        break;
                    case "HOTEL_COMPARISON":
                        setInfoContent();
                        break;
                    case "CUSTOMER_COME_FROM":
                        break;
                    case "PRICE_MINITOR":
                        setInfoContent();
                        break;
                    case "HISTORY_TREND":
                        setInfoContent();
                        break;
                    case "BOOK_MAP":
                        break;
                    case "SERVICE_COVER":
                        break;
                    case "CITY_SENTIMENT":
                        break;
                    case "SIGHT_MAP":
                        sightsoptLayer.show();
                        break;
                }
                return "";
            }
            //////////////////
            // 事件
            (function () {
                // 标签点击事件
                $(function () {
                    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                        var activeTab = $(e.target).text();
                        switch (activeTab) {
                            case "基本信息":
                            case "酒店对比":
                            case "用户画像":
                            case "价格监控":
                            case "历史趋势":
                            case "订房热度":
                            case "服务覆盖":
                            case "城市情感":
                            case "景点关联":
                                // 获取模式标识
                                var flag = getFlag(activeTab);
                                setModeFlag(flag);
                                break;
                        }
                    });
                });

                // 初始化酒店对比输入
                $('input.tagsinput').tagsinput();

                
                // 按钮-比较酒店
                $("#btn_compare").click(function () {
                    $('#tag-box').hide();
                    var items = $('input.tagsinput').val();
                    setComparisionCharts(items);
                });

                // 按钮-比较酒店各房型剩余房间数(房数监控)
                $("#btn_compare_roomnum").click(function () {
                    $('#tag-box').hide();
                    var items = $('input.tagsinput').val();
                    setroomnumCharts(items);
                });

                // 按钮-清除图表和选中内容
                $("#btn_clearSelected").click(function () {
                    $('input.tagsinput').tagsinput('removeAll');
                    document.getElementById("comparison_charts").innerHTML = "";
                });
                
                // 按钮-生成查询范围
                $("#btn_generateBuffer").click(function () {
                    if (hotel == null) {
                        alert("请先选择酒店");
                        return;
                    }
                    // 获取半径
                    var radius = parseInt(document.getElementById("input_buffer").value);
                    // 清除图层
                    gl.clear();
                    var pt = new Point(hotel.geometry.x, hotel.geometry.y, map.spatialReference);
                    var symbol = new SimpleFillSymbol().setColor(null).outline.setColor("red");
                    var circle = new Circle({
                        center: pt,
                        geodesic: true,
                        radius: radius
                    });
                    console.log(circle);
                    var graphic = new Graphic(circle, symbol);
                    gl.add(graphic);
                    map.centerAndZoom(pt, 13);
                });

                // 按钮-设置用户画像
                $("#btn_openCustomerModel").click(function () {
                    // 清除图层
                    gl.clear();
                    var starttime = $('#input_originDate').datepicker('getDate').getTime();
                    var endtime = $('#input_endDate').datepicker('getDate').getTime();
                    var range = document.getElementById("input_buffer").value;
                    // 设置模态框内容为进度条
                    document.getElementById("customer_dialog").innerHTML = document.getElementById("customerProgress_temp").innerHTML;
                    $('#mapModal').modal('show');
                    setCustomerMap(starttime / 1000, endtime / 1000, range);
                });

                // 按钮-比较酒店周期内价格(价格监控)
                $("#btn_compare_parisecontrol").click(function () {
                    $('#tag-box').hide();
                    var items = $('input.tagsinput').val();
                    setpraisecontrolCharts(items);
                });

                // 按钮-清除图表和选中内容(价格监控)
                $("#btn_clearSelected_praisecontrol").click(function () {
                    $('input.tagsinput').tagsinput('removeAll');
                    document.getElementById("praisecontral_charts").innerHTML = "";
                });

                // 按钮-绘制查询区域(订房热度)
                $("#btn_drawTargetArea").click(function () {
                    hexagonLayer.clear();
                    // 激活地图绘制
                    toolbar.activate(Draw.POLYGON);
                });

                // 按钮-蜂窝六边形生成
                $("#btn_hexagon").click(function () {
                    hexagonLayer.clear();
                    var width = parseInt(document.getElementById("input_distant").value);
                    executeHexagonGp(width);
                });

                // 按钮-蜂窝六边行清除
                $("#btn_clearHexagon").click(function () {
                    hexagonLayer.clear();
                });

                // 按钮-绘制约束范围
                $("#btn_drawConstrainArea").click(function () {
                    hexagonLayer.clear();
                    // 激活地图绘制
                    toolbar.activate(Draw.POLYGON);
                });

                // 按钮-添加微博轨迹
                $("#btn_addWeiboTrace").click(function () {
                    
                });

                // 按钮-添加携程轨迹
                $("#btn_addXieChengTrace").click(function () {
                    addXiechengTrace();
                });

                // 按钮-关联分析
                $("#btn_relatedAnalysis").click(function () {
                    $('#relatedAnalysisModal').modal('show');
                    setTimeout(function() {
                        var myChart = echarts.init(document.getElementById("relatedChart"));
                        myChart.setOption(relatedChart_option);
                    },2000);
                });

            })();

            /**
             *  设置酒店各房型剩余房间数比较图表
             * @param items  String   酒店名称序列,使用逗号分隔
             */
            function setroomnumCharts(items) {
                $('input.tagsinput').tagsinput('removeAll');
                // 匿名函数,根据将图表的div容器插入到div中
                (function () {
                    var itemList = items.split(',');
                    var chartsDiv = document.getElementById("praisecontral_charts");
                    chartsDiv.innerHTML = "";
                    for (var i = 0; i < itemList.length; i++) {
                        chartsDiv.innerHTML += tmpl("praisecontrol_temp", { "hotel_name_praisecontrol": itemList[i] });
                        // 在最后插入一个空容器
                        if(i==itemList.length-1)
                            chartsDiv.innerHTML += tmpl("praisecontrol_temp", { "hotel_name_praisecontrol": "nullChart" });
                    }
                })();
                // 请求酒店周期内各个床型的剩余房数，初始化每个图表
                var paramStr = "?hotel_name=" + items;
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getroomnum + paramStr,
                    dataType: "json",
                    timeout: 20000,
                    success: function (result) {
                        for (var key=0;key<(result.length)/2;key++){
                            praisecontrol_option["xAxis"]["data"] = ['3-31','3-14','3-17','3-19','3-21'];
                            praisecontrol_option["title"]["text"] = result[2*key];
                            praisecontrol_option["series"] = [];

                            for (var i = 0;i<5;i++){
                                praisecontrol_option["series"].push({"name":result[2*key+1][1][i],"type":"line","stack":"总量","data":[]});
                                for (var j = 0;j<5;j++){
                                    praisecontrol_option["series"][i]["data"].push(result[2*key+1][i+2][j]);
                                }
                            }
                            var myChart = echarts.init(document.getElementById(result[2*key]));
                            myChart.setOption(praisecontrol_option);
                        }
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
            }


            /**
             *  设置酒店价格监控比较图表
             * @param items  String   酒店名称序列,使用逗号分隔
             */
            function setpraisecontrolCharts(items) {
                $('input.tagsinput').tagsinput('removeAll');
                // 匿名函数,根据将图表的div容器插入到div中
                (function () {
                    var itemList = items.split(',');
                    var chartsDiv = document.getElementById("praisecontral_charts");
                    chartsDiv.innerHTML = "";
                    for (var i = 0; i < itemList.length; i++) {

                        chartsDiv.innerHTML += tmpl("praisecontrol_temp", { "hotel_name_praisecontrol": itemList[i] });
                        // 在最后插入一个空容器
                        if(i==itemList.length-1)
                            chartsDiv.innerHTML += tmpl("praisecontrol_temp", { "hotel_name_praisecontrol": "nullChart" });
                    }
                })();
                // 请求酒店周期内各个床型的价格数据，初始化每个图表
                var paramStr = "?hotel_name=" + items;
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getBedpraise + paramStr,
                    dataType: "json",
                    timeout: 20000,
                    success: function (result) {

                        for (var key = 0; key<(result.length)/2;key++){
                            praisecontrol_option["xAxis"]["data"] = [];
                            praisecontrol_option["title"]["text"] = result[2*key];
                            praisecontrol_option["series"] = [];
                            for(var datanum = 0;datanum<result[2*key+1][1].length;datanum++){
                                praisecontrol_option["xAxis"]["data"].push(result[2*key+1][1][datanum][0]);
                            }
                            for(var praiseandroomdata = 0;praiseandroomdata<(result[2*key+1].length)/2;praiseandroomdata++){
                                praisecontrol_option["series"].push({"name":result[2*key+1][2*praiseandroomdata],"type":"line","stack":"总量","data":[]});
                                for(var praisedata = 0;praisedata<result[2*key+1][1].length;praisedata++ ){
                                    praisecontrol_option["series"][praiseandroomdata]["data"].push(parseInt(result[2*key+1][2*praiseandroomdata+1][praisedata][1]))
                                }
                            }
                            var myChart = echarts.init(document.getElementById(result[2*key]));
                            myChart.setOption(praisecontrol_option);
                        }
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
            }

            /**
            *  设置酒店比较图表
            * @param items  String   酒店名称序列,使用逗号分隔
            */
            function setComparisionCharts(items) {
                $('input.tagsinput').tagsinput('removeAll');
                // 匿名函数,根据将图表的div容器插入到div中
                (function () {
                    var itemList = items.split(',');
                    var chartsDiv = document.getElementById("comparison_charts");
                    chartsDiv.innerHTML = "";
                    for (var i = 0; i < itemList.length; i++) {
                        chartsDiv.innerHTML += tmpl("comparison_temp", { "hotel_name": itemList[i] });
                        // 在最后插入一个空容器
                        if(i==itemList.length-1)
                            chartsDiv.innerHTML += tmpl("comparison_temp", { "hotel_name": "nullChart" });
                    }
                })();
                // 请求酒店对应的观点数据，初始化每个图表
                var paramStr = "?hotel_name=" + items;
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getViewpointTuniu + paramStr,
                    dataType: "json",
                    timeout: 5000,
                    success: function (result) {
                        for (var i = 0; i < result.length; i++) {
                            var hotelInfo = result[i];
                            //  初始化表格设置
                            sentiment_comparison_option["title"]["text"] = hotelInfo["hotel_name"];
                            sentiment_comparison_option["xAxis"][0]["data"] = [];
                            sentiment_comparison_option["series"][0]["data"] = [];
                            
                            // 遍历该酒店的观点，将数据插入到option中
                            var j = 0;
                            
                            for (var key in hotelInfo["viewpoint"]) {
                                sentiment_comparison_option["xAxis"][0]["data"].push(key);
                                sentiment_comparison_option["series"][0]["data"].push(Math.round(hotelInfo["viewpoint"][key] * 100) / 100);
                                if(++j>=5) break;
                            }
                            var myChart = echarts.init(document.getElementById(hotelInfo["hotel_name"]));
                            myChart.setOption(sentiment_comparison_option);
                            myChart.on(echarts.config.EVENT.CLICK, compClick(hotelInfo["hotel_name"]));
                        }
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
            }

            /**
            * 闭包-图表点击事件
            * @param hotelName  String   酒店名
            */
            function compClick(hotelName) {
                /**
                * 设置当前的模式标识
                * @param text 待查询文本
                */
                function initialModalPage(text) {
                    // initial 页眉
                    document.getElementById("commentModalLabel").innerHTML = hotelName;
                    // initial 页脚和页面评论
                    var commentsData = requestComments(hotelName, text, 1);
                    // 如果成功返回数据
                    if (commentsData != null) {
                        document.getElementById("page_list").innerHTML = generateFooterHtml(hotelName, text, 1, commentsData["pageNum"]);
                        document.getElementById("comment_list").innerHTML = generateCommentsHtml(commentsData["comments_info"]);
                    }
                }

                return function (param) {
                    // 模态页初始化
                    initialModalPage(param["name"]);
                    $('#commentModal').modal('show');
                }
            }

            /**
            * 请求酒店的评论
            * @param hotelName  String   酒店名
            * @param text       String   待查询文本
            * @param page       Int      页下标
            */
            function requestComments(hotelName, text, page) {
                var commentsData = null;
                var paramStr = "?hotel_name=" + hotelName + "&text=" + text + "&page=" + page;
                $.ajax({
                    type: "get",
                    async: false, // 异步
                    url: domain + getComments + paramStr,
                    dataType: "json",
                    timeout: 5000,
                    success: function (result) {
                        commentsData = result;
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
                return commentsData;
            }

            /**
            * 根据页数生成切页列表
            * @param hoteName  String     酒店名
            * @param text      Stirng     查询文本
            * @param origin    int        起始页数
            * @param pageNum   int        总页数
            */
            function generateFooterHtml(hotelName, text, origin, pageNum) {
                var pagination = "";
                for (var i = origin; i <= pageNum; i++) {
                    if (i < origin + 10) {
                        // 对前10页做处理
                        if (i == origin) {
                            pagination += '<li class="previous"><a href="javascript:void(0);" class="fui-arrow-left"></a></li>';
                        }
                        pagination += "<li><a href='javascript:void(0);' onclick=\"pageIndexClick('" + hotelName + "','" + text + "',this)\">" + i + '</a></li>';
                        if (i == pageNum) {
                            pagination += '<li class="next"><a href="javascript:void(0);" class="fui-arrow-right"></a></li>';
                        }
                    } else {
                        for (var j = origin + 10; j <= pageNum; j+=10) {
                            if (j == origin + 10) {
                                // 开始li标签，放置一个三角形按钮
                                pagination += '<li class="pagination-dropdown dropup"><a href="javascript:void(0);" class="dropdown-toggle" data-toggle="dropdown"><i class="fui-triangle-up"></i></a><ul class="dropdown-menu">';
                            }
                            if (j+10 > pageNum) {
                                pagination += '<li><a href="javascript:void(0);">' + j + '–' + pageNum + '</a></li>';
                                // 关闭li标签
                                pagination += '</ul></li><li class="next"><a href="javascript:void(0);" class="fui-arrow-right"></a></li>';
                            } else {
                                pagination += '<li><a href="javascript:void(0);">' + j + '–' + (j+10-1) + '</a></li>';
                            }
                        }
                        break;
                    }
                }
                return pagination;
            }

            /**
            * 点击切页时执行
            * @param   comments    list     评论内容
            */
            window.pageIndexClick = function (hotelName, text, e) {
                console.log(e);
                var commentsData = requestComments(hotelName, text, e.text);
                // 如果成功返回数据
                if (commentsData != null) {
                    document.getElementById("comment_list").innerHTML = generateCommentsHtml(commentsData["comments_info"]);
                }
            }

            /**
            * 生成评论列
            * @param   comments    list     评论内容
            */
            function generateCommentsHtml(comments) {
                var commentsHtml = "";
                for (var i = 0; i < comments.length; i++) {
                    commentsHtml += '<li class="list-group-item">'+comments[i][2]+'</li>';
                }
                return commentsHtml;
            }
        });
    });
})();
