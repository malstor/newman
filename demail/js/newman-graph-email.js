/**
 * Created by jlee on 1/4/16.
 */

// context menu
var node_context_menu = [

  {
    title: function(element, d, i) {
      return element.name;
    },
    action: function(element, d, i) {
      //console.log('node-clicked search-by-email');
      //console.log('element:\n' + JSON.stringify(element, null, 2));
    }
  },
  {
    title: function(element, d, i) {
      return '<i class="fa fa-envelope"></i> Search Emails';
    },
    action: function(element, d, i) {

      console.log('node-clicked search-emails-under "' + d.name + '"');
      //console.log('element:\n' + JSON.stringify(d, null, 2));

      // query email documents by email-address
      newman_graph_email_request_by_address.requestService(d.name);

      // display email-tab
      newman_graph_email.displayUITab();
    }
  },
  {
    title: function(element, d, i) {
      return '<i class="fa fa-paperclip"></i> Search Attachments';
    },
    action: function(element, d, i) {

      console.log('node-clicked search-email-attachments-under "' + d.name + '"');
      //console.log('element:\n' + JSON.stringify(d, null, 2));

      // query email documents by email-address
      newman_graph_email_request_by_address.requestService(d.name);

      // display attachment-tab
      newman_email_attach_table.displayUITab();

    }
  },
  {
    title: function(element, d, i) {
      return '<i class="fa fa-users"></i> Search Community';
    },
    action: function(element, d, i) {

      console.log('node-clicked search-community-under "' + d.name + '" community : "' + d.community + '"');
      //console.log('element:\n' + JSON.stringify(d, null, 2));

      // query email documents by community
      newman_graph_email_request_by_community.requestService(d.community);

      // display email-tab
      newman_graph_email.displayUITab();
    }
  }

];

/**
 * email-graph related container
 */
var newman_graph_email = (function () {
  var debug_enabled = false;

  var graph_ui_id = '#graph_email';

  var _top_count;

  var _all_source_node = {};
  var _all_source_node_selected = {};
  var _all_target_node = {};
  var _all_target_node_selected = {};

  var _node_dataset_map = {};
  var _color_scale_max = 40;
  var _dataset_color_map = {};
  var _color_scale_0 = d3.scale.category20c();
  var _color_scale_1 = d3.scale.category20b();

  function getNodeDataset( node_id ) {
    var element = _node_dataset_map[node_id];
    return element;
  }

  function clearAllNodeDataset() {
    var key_list = _.keys(_node_dataset_map);
    _.each(key_list, function(key) {
      var value = _node_dataset_map[key];
      value.datasets.length = 0;
      delete _node_dataset_map[key];
    });
    key_list = _.keys(_dataset_color_map);
    _.each(key_list, function(key) {
      delete _dataset_color_map[key];
    });
  }

  function addNodeDataset( node_id, new_dataset_id ) {
    var element;
    var color = getDefaultDatasetColor();
    var shared_dataset_color = getSharedDatasetColor();

    if (new_dataset_id) {
      var existing_node = _node_dataset_map[node_id];
      if (existing_node) {
        // previously added, shared dataset
        element = clone(existing_node);
        var dataset_added = false;
        _.each(existing_node.datasets, function(dataset_id, index){
          if (dataset_id != new_dataset_id) {
            element.datasets.push( new_dataset_id );
            dataset_added = true;
          }
        });
        if (dataset_added) {
          element.color = shared_dataset_color;
          _node_dataset_map[node_id] = element;
        }
      }
      else { //new node
        var existing_color = _dataset_color_map[new_dataset_id];
        if (existing_color) { // previously added dataset
          color = existing_color;
        }
        else { // new dataset
          var size = _.size(_dataset_color_map);
          var index = size;

          if (size <= _color_scale_max) {
            if (index < 21) {
              color = _color_scale_0(index);
            }
            else {
              color = _color_scale_1(index);
            }
            _dataset_color_map[new_dataset_id] = color;
          }
          else { // out of color-scale range
            color = '#E1E1E1';
            console.log('Max dataset color scale reached!');
          }
        }

        element = {"node_id": node_id, "datasets": [new_dataset_id], "color": color};
        _node_dataset_map[node_id] = element;

      }
    }

    if (debug_enabled) {
      console.log('addNodeDataset(' + node_id + ', ' + new_dataset_id + ')');
      //console.log('node_color_map :\n' + JSON.stringify(_node_dataset_map, null, 2));
    }

    return element;
  }

  function getDefaultDatasetColor() {
    var default_color = '#E1E1E1';
    return default_color;
  }

  function getSharedDatasetColor() {
    var shared_dataset_color = '#FF0000';
    return shared_dataset_color;
  }


  function getDatasetColor( dataset_id_list ) {
    var color = getDefaultDatasetColor();
    if (dataset_id_list && dataset_id_list.length > 0) {
      if (dataset_id_list.length == 1) {
        var existing_color = _dataset_color_map[dataset_id_list[0]];
        if (existing_color) {
          color = existing_color;
        }
      }
      else {
        color = getSharedDatasetColor();
      }
    }
    return color;
  }

  function getNodeDatasetColor( node_id ) {
    //console.log('newman_graph_email.getNodeDatasetColor(' + node_id + ')');
    var color = 'rgb(225, 225, 225)';
    if (node_id) {
      var element = getNodeDataset( node_id );
      if (element) {
        color = element.color;
      }
      else {
        console.log("Dataset color NOT found for '" + node_id +"'!");
      }
    }
    return color;
  }

  function assignNodeColorByDataset( graph ) {
    if (graph && graph.nodes) {
      clearAllNodeDataset();
      _.each(graph.nodes, function(node_element, node_index) {
        if (node_element.original_ingest_id) {
          var node_id = node_element.name;
          var dataset_id_list = node_element.original_ingest_id;
          _.each(dataset_id_list, function(dataset_id) {
            addNodeDataset( node_id, dataset_id );
          });
        }
      });
    }
  }

  function initUI() {

    if (graph_ui_id) {
      $(graph_ui_id).empty();
    }

    // initialize search keyboard event
    $('#txt_search').keyup(function (event) {

      if (event.keyCode === 13) {
        newman_datetime_range.setDatetimeBounds( newman_activity_email.getDatetimeBounds() );
        searchByField();
      }
      event.preventDefault();
    });

    $("#search_form").submit(function (e) {
      return false;
    });

    $('#email_group_conversation').on('click', group_email_conversation);
    //$('#email_view_export_all').on('click', add_view_to_export);
    //$('#email_view_export_all_remove').on('click', remove_view_from_export);

    $('#top-entities').append(waiting_bar);

    $("#txt_search_submit").click(function () {
      newman_datetime_range.setDatetimeBounds( newman_activity_email.getDatetimeBounds() );
      searchByField();
    });

    //on modal close event
    $('#export_modal').on('hidden.bs.modal', function () {
      $('#export_link_spin').show();
      $('#export_download_link').hide();
    });


    $("#export_starred_set").click(function () {
      newman_email_starred_request_export.requestService();
    });

    $("#color_by_dataset").click(function () {
      setGraphNodeColor('dataset_color');
    });

    $("#color_by_community").click(function () {
      //console.log($("#color_by_community").val());
      setGraphNodeColor('community_color');
    });

    $("#color_by_domain").click(function () {
      //console.log($("#color_by_domain").val());
      setGraphNodeColor('domain_color');
    });

    $("#usetext").on("change", function () {
      toggle_labels();
    });

    $("#rankval").click(function () {
      console.log(d3.select("#rankval").property("checked"));
      if (d3.select("#rankval").property("checked")) {
        d3.selectAll("circle").style("opacity", function (d) {
          return 0.2 + (d.rank);
        });
        d3.selectAll("circle").style("stroke-width", function (d) {
          return 5 * (d.rank);
        });
      }
      else {
        d3.selectAll("circle").style("opacity", "100");
        d3.selectAll("circle").style("stroke-width", "0");
      }
      //setGraphNodeColor('rank');
    });

    $("#email_analytics_prev_button").on("click", function(e) {
      if (debug_enabled) {
        console.log('"email_analytics_prev_button" clicked');
      }

      app_nav_history.loadDashboard()

      e.preventDefault();
    });

  } // end-of initUI

  function setHeaderLabelEmailAnalytics( analytics_label, analytics_icon_class, data_source_label, data_source_icon_class ) {

    var label_field = $("#email_analytics_label");
    if (label_field) {
        label_field.empty();

      if (analytics_label && analytics_icon_class) {
        if (debug_enabled) {
          console.log('setHeaderLabelEmailAnalytics( ' + analytics_label + ', ' + analytics_icon_class + ' )');
        }

        var label_html =
          '<i class="' + analytics_icon_class + '" ></i>&nbsp;' +
          truncateString(analytics_label, app_display_config.getLabelLengthMax());

          label_field.html( label_html );
      }
    }
  }

  /* deprecated since v2.11 */
  /*
  var highlight_target = (function () {
    var groupId = data_source_selected_map.group;
    var rank = data_source_selected_map.rank;
    var highlight = function () {
      //graph
      d3.select("#g_circle_" + groupId).style("stroke", "#ffff00");
      d3.select("#g_circle_" + groupId).style("stroke-width", function (d) {
        return 10;
      });
      //email-table
      $('#result_table tbody tr td:nth-child(2)').each(function (i, el) {
        if (data_source_selected_map.email.localeCompare(el.innerText.trim()) == 0) {
          $(el).addClass('highlight-td');
        }
      });
    }

    var unhighlight = function () {
      //graph
      d3.select("#g_circle_" + groupId).style("stroke", "#ff0000");
      if (d3.select("#rankval").property("checked")) {
        d3.select("#g_circle_" + groupId).style("opacity", function (d) {
          return 0.2 + (rank);
        });
        d3.select("#g_circle_" + groupId).style("stroke-width", function (d) {
          return 5 * (rank);
        });
      }
      else {
        d3.select("#g_circle_" + groupId).style("opacity", "100");
        d3.select("#g_circle_" + groupId).style("stroke-width", "0");
      }
      //email-table
      $('#result_table tbody tr td:nth-child(2)').each(function (i, el) {
        $(el).removeClass('highlight-td');
      });
    };

    return {
      'highlight': highlight,
      'unhighlight': unhighlight
    }
  }());
  */


  function getTopCount() {
    _top_count;
  }

  function appendAllSourceNodeSelected(url_path) {

    if (url_path) {
      if (url_path.endsWith('/')) {
        url_path = url_path.substring(0, url_path.length - 1);
      }

      var node_set_as_string = '';
      var keys = _.keys(_all_source_node_selected);
      if (keys) {
        _.each(keys, function(key) {
          node_set_as_string += key + ' ';
        });
      }

      if(node_set_as_string) {
        node_set_as_string = encodeURIComponent( node_set_as_string.trim().replace(/\s/g, ',') );
        var key = 'sender'
        if (url_path.indexOf('?') > 0) {
          url_path += '&' + key + '=' + node_set_as_string;
        }
        else {
          url_path += '?' + key + '=' + node_set_as_string;
        }
      }


    }

    return url_path;
  }

  function appendAllTargetNodeSelected(url_path) {

    if (url_path) {
      if (url_path.endsWith('/')) {
        url_path = url_path.substring(0, url_path.length - 1);
      }

      var node_set_as_string = '';
      var keys = _.keys(_all_target_node_selected);
      if (keys) {
        _.each(keys, function(key) {
          node_set_as_string += key + ' ';
        });
      }

      if(node_set_as_string) {
        node_set_as_string = encodeURIComponent( node_set_as_string.trim().replace(/\s/g, ',') );
        var key = 'recipient'
        if (url_path.indexOf('?') > 0) {
          url_path += '&' + key + '=' + node_set_as_string;
        }
        else {
          url_path += '?' + key + '=' + node_set_as_string;
        }
      }


    }

    return url_path;
  }

  function _addSourceNodeSelected(key, value) {
    if (key && value) {
      //key = encodeURIComponent(key);

      var object = {"key": key, "value": value}

      _all_source_node_selected[key] = object;
    }
  }

  function _removeSourceNodeSelected(key) {
    if (key) {
      delete _all_source_node_selected[key];
    }
  }

  function _addTargetNodeSelected(key, value) {
    if (key && value) {
      //key = encodeURIComponent(key);

      var object = {"key": key, "value": value}

      _all_target_node_selected[key] = object;
    }
  }

  function _removeTargetNodeSelected(key) {
    if (key) {
      delete _all_target_node_selected[key];
    }
  }

  function _removeNode(key) {
    if (key) {
      delete _all_source_node[key];
      delete _all_source_node_selected[key];
      delete _all_target_node[key];
      delete _all_target_node_selected[key];
    }
  }

  function setNodeSelected(key, role, value, is_selected, refresh_ui) {
    if (role) {
      if (key && role && value) {

        if (role == 'source') {
          if (is_selected) {
            _addSourceNodeSelected(key, value);
          }
          else {
            _removeSourceNodeSelected(key)
          }
        }

        if (role == 'target') {
          if (is_selected) {
            _addTargetNodeSelected(key, value);
          }
          else {
            _removeTargetNodeSelected(key)
          }
        }

        console.log('all-selected-source-node :\n' + JSON.stringify(_all_source_node_selected, null, 2));
        console.log('all-selected-target-node :\n' + JSON.stringify(_all_target_node_selected, null, 2));

        if (refresh_ui) {
          //trigger refresh

        }
      }
    }
  }

  function sizeOfAllSourceNodeSelected() {
    var size = _.size( _all_source_node_selected );
    return size;
  }

  function getAllSourceNodeSelected() {
    var keys = _.keys( _all_source_node_selected );
    return keys;
  }

  function getAllSourceNodeSelectedAsString() {
    var node_set_as_string = '';
    var keys = getAllSourceNodeSelected();
    if (keys) {
      _.each(keys, function(key) {
        node_set_as_string += key + ' ';
      });
    }

    node_set_as_string = node_set_as_string.trim().replace(/\s/g, ',');

    return node_set_as_string;
  }

  function sizeOfAllTargetNodeSelected() {
    var size = _.size( _all_target_node_selected );
    return size;
  }

  function getAllTargetNodeSelected() {
    var keys = _.keys( _all_target_node_selected );
    return keys;
  }

  function getAllTargetNodeSelectedAsString() {
    var node_set_as_string = '';
    var keys = getAllTargetNodeSelected();
    if (keys) {
      _.each(keys, function(key) {
        node_set_as_string += key + ' ';
      });
    }

    node_set_as_string = node_set_as_string.trim().replace(/\s/g, ',');

    return node_set_as_string;
  }

  function clearAllSourceNodeSelected() {
    _all_source_node_selected = {};
  }

  function clearAllTargetNodeSelected() {
    _all_target_node_selected = {};
  }

  function clearAllNodeSelected() {
    clearAllSourceNodeSelected();
    clearAllTargetNodeSelected();

    $('#query_prev_email').addClass( 'clickable-disabled' );
    $('#query_next_email').addClass( 'clickable-disabled' );
  }

  function onNodeClicked(key, value) {
    console.log( 'onNodeClicked( ' + key + ', ' + value + ' )' );



  }

  function displayUITab() {

    $('#tab-list li:eq(0) a').tab('show');

  }

  function updateUIGraphView( search_response, auto_display_doc_uid, starred_email_doc_list ) {
    console.log("newman_graph_email.updateUIGraphView(...) : auto_display_doc_uid = '" + auto_display_doc_uid + "'");
    //console.log('search_response:\n' + JSON.stringify(search_response, null, 2));

    //validate search-response if enabled

    var filtered_response = search_response;
    if (app_validation_config.validateEmailSearchResponse()) {
      //console.log('search_response validation enabled!');
      filtered_response = validateEmailSearchResponse(search_response);
    }
    else {
      console.log('search_response validation disabled!');
    }
    //console.log('filtered_response:\n' + JSON.stringify(filtered_response, null, 2));

    // open analytics content view
    email_analytics_content.open();

    // populate data-table
    $('#document_count').text(filtered_response.query_hits);
    console.log('email_docs[ ' + search_response.rows.length + ' ]');
    newman_email_doc_table.populateDataTable( filtered_response.rows );

    if (starred_email_doc_list ) {
      newman_email_doc_table.setStarredEmailDocumentList( starred_email_doc_list );
    }

    // populate attachment-table
    console.log('attachment_docs[ ' + search_response.attachments.length + ' ]');
    newman_email_attach_table.onRequestEmailAttachList( filtered_response.attachments );

    // initialize to blank
    updateUIInboundCount();
    updateUIOutboundCount();

    // assign node color by data-source
    assignNodeColorByDataset( filtered_response.graph );

    // render graph display
    drawGraph( filtered_response.graph );

    // automatically highlight a document if applicable
    if (auto_display_doc_uid) {
      console.log( 'auto_display-document : ' + auto_display_doc_uid );
      // make email-document-content-view visible and open
      bottom_panel.open();

      newman_email_doc_table.highlightDataTableRow( auto_display_doc_uid );
    }
    else {
      // make email-document-content-view visible but closed
      bottom_panel.close();

      // clear existing content if any
      newman_email_doc_view.clearDocument();
    }
  }


  return {
    'initUI' : initUI,
    'setHeaderLabelEmailAnalytics' : setHeaderLabelEmailAnalytics,
    'updateUIGraphView' : updateUIGraphView,
    'getTopCount' : getTopCount,
    'setNodeSelected' : setNodeSelected,
    'onNodeClicked' : onNodeClicked,
    'clearAllSourceNodeSelected' : clearAllSourceNodeSelected,
    'clearAllTargetNodeSelected' : clearAllTargetNodeSelected,
    'clearAllNodeSelected' : clearAllNodeSelected,
    'sizeOfAllSourceNodeSelected' : sizeOfAllSourceNodeSelected,
    'getAllSourceNodeSelected' : getAllSourceNodeSelected,
    'getAllSourceNodeSelectedAsString' : getAllSourceNodeSelectedAsString,
    'appendAllSourceNodeSelected' : appendAllSourceNodeSelected,
    'sizeOfAllTargetNodeSelected' : sizeOfAllTargetNodeSelected,
    'getAllTargetNodeSelected' : getAllTargetNodeSelected,
    'getAllTargetNodeSelectedAsString' : getAllTargetNodeSelectedAsString,
    'appendAllTargetNodeSelected' : appendAllTargetNodeSelected,
    'displayUITab' : displayUITab,
    'getNodeDatasetColor' : getNodeDatasetColor,
    'getDatasetColor' : getDatasetColor
  }

}());



/**
 * service container email-documents-search-by-address
 * @type {{requestService, getResponse}}
 */
var newman_graph_email_request_by_address = (function () {

  var _service_url = 'search/search/email';
  //var _service_url = 'search/search_by_address';
  var _response;

  function getServiceURLBase() {
    return _service_url;
  }

  function getServiceURL(email_address) {
    console.log('newman_service_email_by_address.getServiceURL(' + email_address + ')');

    if (email_address) {

      var service_url = _service_url + '/' + encodeURIComponent(email_address.trim());
      service_url = newman_data_source.appendDataSource(service_url);
      service_url = newman_datetime_range.appendDatetimeRange(service_url);

      // append query-string
      service_url = newman_search_filter.appendURLQuery(service_url);

      return service_url;
    }
  }

  function requestService(email_address) {

    console.log('newman_service_email_by_address.requestService()');
    var service_url = getServiceURL(email_address);
    $.get( service_url ).then(function (response) {
      setResponse( response );
      newman_graph_email.updateUIGraphView( response );

      // add to work-flow-history
      app_nav_history.appendHist(service_url, 'email', email_address);
    });
  }

  function setResponse( response ) {
    if (response) {

      _response = response;
      //console.log('\tfiltered_response: ' + JSON.stringify(_response, null, 2));
    }
  }

  function getResponse() {
    return _response;
  }

  return {
    'getServiceURLBase' : getServiceURLBase,
    'getServiceURL' : getServiceURL,
    'requestService' : requestService,
    'getResponse' : getResponse,
    'setResponse' : setResponse
  }

}());

/**
 * service container email-documents-search-by-conversation-forward-or-backward
 * @type {{requestService, getResponse}}
 */
var newman_graph_email_request_by_conversation_forward_backward = (function () {

  var _service_url = 'search/search_by_conversation_forward_backward';
  var _response;

  function getServiceURLBase() {
    return _service_url;
  }

  function getServiceURL(order, current_datetime) {
    var start_datetime_override = undefined;
    var end_datetime_override = undefined;

    var service_url = newman_data_source.appendDataSource(_service_url);

    if (!order) {
      order = 'next';
    }

    if (order == 'prev') {
      end_datetime_override = current_datetime;
    }
    else if (order == 'next') {
      start_datetime_override = current_datetime;
    }

    if (service_url.indexOf('?') > 0) {
      service_url += '&order=' + order;
    }
    else {
      service_url += '?order=' + order;
    }

    service_url = newman_datetime_range.appendDatetimeRange(service_url, start_datetime_override, end_datetime_override);
    service_url = newman_graph_email.appendAllSourceNodeSelected(service_url);
    service_url = newman_graph_email.appendAllTargetNodeSelected(service_url);

    // append query-string
    service_url = newman_search_filter.appendURLQuery(service_url);

    return service_url;
  }

  function requestService(order, document_uid, document_datetime, auto_display_enabled) {
    console.log('newman_graph_email_request_by_conversation_forward_backward.requestService()');

    var service_url = getServiceURL(order, document_datetime);
    $.get( service_url ).then(function (response) {
      setResponse( response );

      if (auto_display_enabled === true) {
        newman_graph_email.updateUIGraphView(response, document_uid);
      }
      else {
        newman_graph_email.updateUIGraphView(response);
      }

      // add to work-flow-history
      var address_set_as_string = newman_graph_email.getAllSourceNodeSelectedAsString() + ' ' + newman_graph_email.getAllTargetNodeSelectedAsString();
      address_set_as_string = address_set_as_string.trim().replace(/\s/g, ',');
      app_nav_history.appendHist(service_url, 'email', address_set_as_string);
    });
  }

  function setResponse( response ) {
    if (response) {

      _response = response;
      //console.log('\tfiltered_response: ' + JSON.stringify(_response, null, 2));
    }
  }

  function getResponse() {
    return _response;
  }


  return {
    'getServiceURLBase' : getServiceURLBase,
    'getServiceURL' : getServiceURL,
    'requestService' : requestService,
    'getResponse' : getResponse,
    'setResponse' : setResponse
  }

}());

/**
 * service container email-documents-search-by-community
 * @type {{requestService, getResponse}}
 */
var newman_graph_email_request_by_community = (function () {

  var _service_url = 'search/search_by_community';
  var _response;

  function getServiceURLBase() {
    return _service_url;
  }

  function getServiceURL(community_key) {
    console.log('newman_graph_email_request_by_community.getServiceURL(' + community_key + ')');

    if (community_key) {

      var service_url = _service_url + '/' + encodeURIComponent(community_key.trim());
      service_url = newman_data_source.appendDataSource(service_url);
      service_url = newman_datetime_range.appendDatetimeRange(service_url);

      // append query-string
      service_url = newman_search_filter.appendURLQuery(service_url);

      return service_url;
    }
  }

  function requestService(email_address) {

    console.log('newman_graph_email_request_by_community.requestService()');
    var service_url = getServiceURL(email_address);
    $.get( service_url ).then(function (response) {
      setResponse( response );
      newman_graph_email.updateUIGraphView( response );

      // add to work-flow-history
      app_nav_history.appendHist(service_url, 'community', email_address);
    });
  }

  function setResponse( response ) {
    if (response) {

      _response = response;
      //console.log('\tfiltered_response: ' + JSON.stringify(_response, null, 2));
    }
  }

  function getResponse() {
    return _response;
  }

  return {
    'getServiceURLBase' : getServiceURLBase,
    'getServiceURL' : getServiceURL,
    'requestService' : requestService,
    'getResponse' : getResponse,
    'setResponse' : setResponse
  }

}());

/**
 * service response container email-documents-search-by-topic
 * @type {{requestService, getResponse}}
 */
var newman_graph_email_request_by_topic = (function () {

  var _service_url = 'search/search_by_topic';
  var _response;

  function getServiceURLBase() {
    return _service_url;
  }

  function getServiceURL() {

    var service_url = newman_data_source.appendDataSource(_service_url);
    service_url = newman_datetime_range.appendDatetimeRange(service_url);
    service_url = newman_topic_email.appendTopic(service_url);

    // append query-string
    service_url = newman_search_filter.appendURLQuery(service_url);

    return service_url;
  }

  function requestService() {

    console.log('newman_service_topic_search.requestService()');
    var service_url = getServiceURL();
    $.get( service_url ).then(function (response) {
      setResponse( response );
      newman_graph_email.updateUIGraphView( response );

      // add to work-flow-history
      var topic_set_as_string = newman_topic_email.getAllTopicSelectedAsString();
      app_nav_history.appendHist(service_url, 'topic', topic_set_as_string);
    });
  }

  function setResponse( response ) {
    if (response) {

      _response = response;
      //console.log('\tfiltered_response: ' + JSON.stringify(_response, null, 2));
    }
  }

  function getResponse() {
    return _response;
  }


  return {
    'getServiceURLBase' : getServiceURLBase,
    'getServiceURL' : getServiceURL,
    'requestService' : requestService,
    'getResponse' : getResponse,
    'setResponse' : setResponse
  }

}());

/**
 * service container email-documents-search-by-conversation
 * @type {{requestService, getResponse}}
 */
var newman_graph_email_request_by_conversation = (function () {

  var _service_url = 'search/search_by_conversation';
  var _response;

  function getServiceURLBase() {
    return _service_url;
  }

  function getServiceURL(document_uid, document_datetime) {


    var service_url = newman_data_source.appendDataSource(_service_url);

    // append date-time (start-datetime, end-datetime)
    service_url = newman_datetime_range.appendDatetimeRange(service_url);

    // append sender-addresses
    service_url = newman_graph_email.appendAllSourceNodeSelected(service_url);

    // append recipient-addresses
    service_url = newman_graph_email.appendAllTargetNodeSelected(service_url);

    // append query-string
    service_url = newman_search_filter.appendURLQuery(service_url);

    if (document_uid) {
      if (service_url.indexOf('?') > 0) {
        service_url += '&document_uid=' + document_uid;
      }
      else {
        service_url += '?document_uid=' + document_uid;
      }
    }

    if (document_datetime) {
      if (service_url.indexOf('?') > 0) {
        service_url += '&document_datetime=' + document_datetime;
      }
      else {
        service_url += '?document_datetime=' + document_datetime;
      }
    }

    return service_url;
  }

  function requestService(document_uid, document_datetime, auto_display_enabled) {

    console.log('newman_graph_email_request_by_conversation.requestService()');
    var service_url = getServiceURL(document_uid, document_datetime);
    $.get( service_url ).then(function (response) {
      setResponse( response );
      if (auto_display_enabled === true) {
        newman_graph_email.updateUIGraphView(response, document_uid);
      }
      else {
        newman_graph_email.updateUIGraphView(response);
      }

      // add to work-flow-history
      var address_set_as_string = newman_graph_email.getAllSourceNodeSelectedAsString() + ' ' + newman_graph_email.getAllTargetNodeSelectedAsString();
      address_set_as_string = address_set_as_string.trim().replace(/\s/g, ',');
      app_nav_history.appendHist(service_url, 'conversation', address_set_as_string);
    });
  }

  function setResponse( response ) {
    if (response) {

      _response = response;
      //console.log('\tfiltered_response: ' + JSON.stringify(_response, null, 2));
    }
  }

  function getResponse() {
    return _response;
  }


  return {
    'getServiceURLBase' : getServiceURLBase,
    'getServiceURL' : getServiceURL,
    'requestService' : requestService,
    'getResponse' : getResponse,
    'setResponse' : setResponse
  }

}());

var newman_graph_email_visual_filter = (function () {

  var ui_container = $('#graph-visual-filter-email');

  var open = function () {
    if (isHidden()) {
      ui_container.fadeToggle('fast');
    }
  };

  var show = function () {
    ui_container.css("display", "block");
  };

  var close = function () {
    if (isVisible()) {
      ui_container.fadeToggle('fast');
    }
  };

  var hide = function () {
    ui_container.css("display", "none");
  };

  var isVisible = function () {
    return (ui_container && (ui_container.is(':visible') || (ui_container.css('display') != 'none')));
  };

  var isHidden = function () {
    return (ui_container && ( ui_container.is(':hidden') || (ui_container.css('display') == 'none')));
  };

  return {
    'open': open,
    'show': show,
    'close': close,
    'hide': hide,
    'isVisible': isVisible,
    'isHidden': isHidden
  };

}());