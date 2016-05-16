(function () {
    $(document).ready(function() {
        require([
            "dojo",
            "esri/Color",
            "esri",
            "esri/map",
            "tdtlib/TDTVecLayer",
            "esri/geometry/Point",
            "esri/geometry/Polyline",
            "esri/geometry/Circle",
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
            "dojo/domReady!"
        ],
        function (
            dojo,
            Color,
            esri,
            Map,
            TDTVecLayer,
            Point,
            Polyline,
            Circle,
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
            Geoprocessor
        ) {
            // 地图
            var map;

            var gp;

            var gl;

            var gf;

            var featureMap, graphicsLayer;

            var hotel;

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
                    console.log(navbarHight);
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
                
                featureMap = new FeatureLayer(serverDomain + featureUrl, {
                    mode: FeatureLayer.MODE_SNAPSHOT,
                    outFields: ["*"],
                });

                map.addLayer(featureMap);
                graphicsLayer = new GraphicsLayer();
                var symbol = new SimpleFillSymbol();
                symbol.setColor(new Color([150, 150, 150, 0.8]));
                var renderer = new ClassBreaksRenderer(symbol, "count_");
                renderer.addBreak(0, 5, new SimpleFillSymbol().setColor(new Color([56, 168, 0, 0.8])));
                renderer.addBreak(6, 13, new SimpleFillSymbol().setColor(new Color([102, 191, 0, 0.8])));
                renderer.addBreak(14, 26, new SimpleFillSymbol().setColor(new Color([155, 217, 0, 0.8])));
                renderer.addBreak(27, 45, new SimpleFillSymbol().setColor(new Color([222, 242, 0, 0.8])));
                renderer.addBreak(46, 116, new SimpleFillSymbol().setColor(new Color([255, 141, 0, 0.8])));
                renderer.addBreak(117, 296, new SimpleFillSymbol().setColor(new Color([255, 110, 0, 0.8])));
                renderer.addBreak(297, 516, new SimpleFillSymbol().setColor(new Color([255, 72, 0, 0.8])));
                renderer.addBreak(517, Infinity, new SimpleFillSymbol().setColor(new Color([255, 0, 0, 0.8])));
                graphicsLayer.setRenderer(renderer);
                map.addLayer(graphicsLayer);
                gl = new GraphicsLayer({id:"pointLayer"});
                map.addLayer(gl);

                gf = new GraphicsLayer({id:"FillLayer"});
                map.addLayer(gf);

                var pt = new Point(103.847, 36.0473);
                map.centerAndZoom(pt, 3);
                connect.connect(featureMap, "onClick", graphicOnClick);
            })();

            /////////////
            // 初始化行为
            (function() {
                // 设置页面标识
                var flag = getFlag(GetArgsFromHref(window.location.href, "mode"));
                setModeFlag(flag);
                // 输入提示
                //var states = new Bloodhound({
                //    datumTokenizer: function (d) { return Bloodhound.tokenizers.whitespace(d.word); },
                //    queryTokenizer: Bloodhound.tokenizers.whitespace,
                //    limit: 4,
                //    local: [
                //      { word: "Alabama" },
                //      { word: "Alaska" },
                //      { word: "Arizona" },
                //      { word: "Arkansas" },
                //      { word: "California" },
                //      { word: "Colorado" }
                //    ]
                //});
                //states.initialize();
                //$('input.typeahead-only').typeahead(null, {
                //    name: 'states',
                //    displayKey: 'word',
                //    source: states.ttAdapter()
                //});
            })();


            

            /**
             * 几何点击事件：根据标识触发行为
             */
            function graphicOnClick(evt) {
                hotel = evt.graphic;
                switch (MODE_FLAG) {
                    case "HOTEL_SENTIMENT": //酒店情感功能
                        updateAndSetOption();
                        break;
                    case "HISTORY_TREND": //历史趋势功能
                        setTrendChart();
                        break;

                }
            }

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
                var paramStr = "?hotel_name=" + hotel.attributes["hotel_name"];
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
                reviewPie_option["series"][0]["data"] = [];
                var paramStr = "?hotel_name=" + hotel.attributes["hotel_name"];
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
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
            }

            /**
            * 更新数据并加载形容词词云
            * @param   container   String   容器，放置评论类型饼图
            */
            function updateAndSetWordCloud(container) {
                wordCloud_option["series"][0]["data"] = [];
                var paramStr = "?hotel_name=" + hotel.attributes["hotel_name"];
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
                        alert("你输入的值有误,请输入完整参数或者重试");
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

                            if (key < 1200) {
                                drwa_maxdistance_circular(result[key][0][1][0], result[key][0][1][1], result[key][1][1]);
                            }

                        }
                        loadaroundfac('zhoubiansheshi');

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
                //if (hotelX != 118.77807440803) {
                //    if(hotelX != 118.77829690033) {
                        //if (hotelX != 118.79560564853) {
                        //    if(hotelX != 118.79535319773) {
                        //        if(hotelX != 118.79157998222) {
                        //            if (hotelX != 118.79189629625) {
                                        var pt = new Point(hotelX, hotelY, map.spatialReference);
                                        var symbol = new SimpleFillSymbol().setColor(null).outline.setColor("green");
                                        var circle = new Circle({
                                            center: pt,
                                            geodesic: true,
                                            radius: banjing
                                        });
                                        var graphic = new Graphic(circle, symbol);
                                        gl.add(graphic);
                                    //}
                                //}
                            //}
                        //}
                    //}
                //}
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
             * 获取数据绘制周边设施连线和点
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
                                //drwaPoint(result[key][1][key2][0],result[key][1][key2][1]);  //设施坐标点
                                //drwaPoint(result[key][0][0],result[key][0][1]); //酒店坐标点
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
                    new Color([255,0,0]),
                    2
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
                var paramStr = "?lat=" + hotel.geometry.y + "&lng=" + hotel.geometry.x + "&starttime=" + starttime + "&endtime=" + endtime + "&range=" + range;
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getWeiboCome + paramStr,
                    dataType: "json",
                    timeout: 100000,
                    success: function (result) {
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
                                // 终点
                                console.log(result["city_location"][item]);
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
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
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
                myChart.on(echarts.config.EVENT.CLICK, function(params){
                    var scopelist = (params.name).split("-");
                    draw_maxdistance_circular_fixed(scopelist[0],scopelist[1])
                });
            }

            function draw_maxdistance_circular_fixed(min,max) {
                $.ajax({
                    type: "get",
                    async: true, // 异步
                    url: domain + getMaxDistance,
                    dataType: "json",
                    timeout: 30000,
                    success: function (result) {
                        gl.clear();
                        aroundmaxdistanceoption["xAxis"]["data"] = [];
                        aroundmaxdistanceoption["series"][0]["data"] = [];
                        aroundmaxdistanceoption["yAxis"].push({gridIndex: 0, min: min, max: max});
                        for (var key in result) {
                            if (key < 1000) {
                                drwa_maxdistance_circular_fixed(result[key][0][1][0], result[key][0][1][1], result[key][1][1], min, max);
                            }
                            if (key < 1000) {
                                if (result[key][1][1] > min && result[key][1][1] <= max) {
                                    aroundmaxdistanceoption["xAxis"]["data"].push(result[key][0][0]);
                                    aroundmaxdistanceoption["series"][0]["data"].push([result[key][0][0], result[key][1][1]]);
                                }
                            }
                        }
                        load_maxdistance('zuiyuanjvli');
                        aroundmaxdistanceoption["yAxis"] = [];
                    },
                    error: function (errorMsg) {
                        console.log(errorMsg);
                        alert("你输入的值有误,请输入完整参数或者重试");
                    }
                });
            }

            function drwa_maxdistance_circular_fixed(hotelX,hotelY,banjing,min,max){
                if (banjing>=min&&banjing<=max) {
                    var pt = new Point(hotelX, hotelY, map.spatialReference);
                    var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                        new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT,
                        new Color([148,0,211]), 2),new Color([0,255,255])
                    );
                    var circle = new Circle({
                        center: pt,
                        geodesic: true,
                        radius: banjing
                    });
                    var graphic = new Graphic(circle, symbol);
                    gl.add(graphic);
                }
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
            * 加载图表
            */
            //function resetHotelSentimentOption() {
            //    loadReviewPie('review-rate');
            //    loadWordCloud('word-cloud');
            //    loadSentimentChart('sentiment-table');
            //}

            

            /**
            * 生成蜂窝六边形
            */
            function executeHexagonGp(width) {
                gp = new Geoprocessor(serverDomain + gpUrl);
                gp.setOutSpatialReference({
                    wkid: 4326
                });
                var featureset = new esri.tasks.FeatureSet();
                featureset.features = featureMap.graphics;
                featureset.spatialReference = new esri.SpatialReference({ wkid: 102100 });
                var parms = {
                    "Feature_Set": featureset,
                    "Width": width
                };
                gp.submitJob(parms, jobResult);
            }
            /**
            * 脚本执行完成时回调
            */
            function jobResult(result) {
                console.log(result);
                var jobId = result.jobId;
                var status = result.jobStatus;
                if (status === esri.tasks.JobInfo.STATUS_SUCCEEDED) {
                    gp.getResultData(jobId, "Result_Hexagon", addResults);
                }
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
                    graphicsLayer.add(features[i]);
                }
                map.setExtent(GraphicsUtils.graphicsExtent(graphicsLayer.graphics));
            }

            /**
            * 设置弹窗-切换功能标签时执行
            */
            function setInfoContent() {
                var infotemplate = new InfoTemplate();
                infotemplate.setTitle("<b>${hotel_name}</b>");
                switch(MODE_FLAG) {
                    case "PRICE_MINITOR":
                        infotemplate.setContent("<a href='javascript:void(0);' data-name='${hotel_name}' onclick='markerClick(this)'>添加</a><br/><b>评论数</b>:${count_}");

                    case "HOTEL_COMPARISON":
                        infotemplate.setContent("<a href='javascript:void(0);' data-name='${hotel_name}' onclick='markerClick(this)'>添加</a><br/><b>评论数</b>:${count_}");
                        break;
                    default:
                        infotemplate.setContent("<b>评论数</b>:${count_}");
                }
                featureMap.setInfoTemplate(infotemplate);
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
                    case "酒店情感":
                        return "HOTEL_SENTIMENT";
                    case "酒店对比":
                        return "HOTEL_COMPARISON";
                    case "客源地图":
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
                    case "景点热度":
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
                            case "酒店情感":
                            case "酒店对比":
                            case "客源地图":
                            case "价格监控":
                            case "历史趋势":
                            case "订房热度":
                            case "服务覆盖":
                            case "城市情感":
                            case "景点热度":
                                // 获取模式标识
                                var flag = getFlag(activeTab);
                                setModeFlag(flag);
                                break;
                        }
                    });
                });

                // 初始化酒店对比输入
                $('input.tagsinput').tagsinput();

                // 按钮-蜂窝六边形生成
                $("#btn_hexagon").click(function () {
                    var width = parseInt(document.getElementById("input_distant").value);
                    executeHexagonGp(width);
                });
                // 按钮-蜂窝六边行清除
                $("#btn_clearHexagon").click(function () {
                    graphicsLayer.clear();
                });
                // 按钮-比较酒店
                $("#btn_compare").click(function () {
                    $('#tag-box').hide();
                    var items = $('input.tagsinput').val();
                    setComparisionCharts(items);
                });
                // 按钮-比较酒店周期内价格(价格监控)
                $("#btn_compare_parisecontrol").click(function () {
                    $('#tag-box').hide();
                    var items = $('input.tagsinput').val();
                    setpraisecontrolCharts(items);
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
                // 按钮-清除图表和选中内容(价格监控和剩余房间数)
                $("#btn_clearSelected_praisecontrol").click(function () {
                    $('input.tagsinput').tagsinput('removeAll');
                    document.getElementById("praisecontral_charts").innerHTML = "";
                });
                // 按钮-设置客源地图
                $("#btn_customerMap").click(function () {
                    var starttime = $('#input_originDate').datepicker('getDate').getTime();
                    var endtime = $('#input_endDate').datepicker('getDate').getTime();
                    var range = document.getElementById("input_buffer").value;
                    $('#mapModal').modal('show');
                    setCustomerMap(starttime / 1000, endtime / 1000, range);
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
                    url: domain + getViewpoint + paramStr,
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

