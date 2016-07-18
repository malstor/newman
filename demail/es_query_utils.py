import tangelo
import time
from newman.es_connection import es


def get_graph_row_fields():
    return ["id","tos","senders","ccs","bccs","datetime","subject","body","attachments.guid","starred","case_id","ingest_id","alt_ref_id","label"]

def _map_emails(fields):
    row = {}
    row["email_id"] =  fields["id"][0]
    row["from"] = fields.get("senders",[""])[0]
    row["to"] = fields.get("tos", [])
    row["cc"] = fields.get("ccs", [])
    row["bcc"] = fields.get("bccs", [])
    row["datetime"] = fields.get("datetime",[""])[0]
    row["subject"] =  fields.get("subject",[""])[0]
    row["starred"] = fields.get("starred", [False])[0]
    row["attach"] =  str(len(fields.get("attachments.guid",[])))
    row["bodysize"] = len(fields.get("body",[""])[0])

    for name, val in fields.items():
        if name.startswith("topic"):
            row["topic_idx"] = name.split(".")[1]
            row["topic_score"] = val[0]

    # Collection meta
    row["original_ingest_id"] = fields["ingest_id"][0]
    row["original_case_id"] = fields["case_id"][0]
    row["original_alt_ref_id"] = fields["alt_ref_id"][0]
    row["original_label"] = fields["label"][0]

    return row

def _map_emails_to_row(row):
    row["to"] = ';'.join(row["to"])
    row["cc"] = ';'.join(row["cc"])
    row["bcc"] = ';'.join(row["bcc"])
    return row


def _map_node(email_addr, total_docs, ingest_set):
    node={}
    name = email_addr["addr"][0]
    node["community"] = email_addr.get("community", ["<address_not_specified>"])[0]
    node["name"] = name
    node["num"] =  email_addr["sent_count"][0] + email_addr["received_count"][0]
    node["rank"] = (email_addr["sent_count"][0] + email_addr["received_count"][0]) / float(total_docs)
    node["email_sent"] = (email_addr["sent_count"][0])
    node["email_received"] = (email_addr["received_count"][0])
    node["original_ingest_id"] = ingest_set
    return node

def _query_email_attachments(index, size, emails_query):
    tangelo.log("_query_email_attachments.Query %s"%emails_query)

    attachments_resp = es().search(index=index, doc_type="emails", size=size, body=emails_query)

    email_attachments = []
    try:
        for attachment_item in attachments_resp["hits"]["hits"]:
            _source = attachment_item["_source"]
            email_entry = {
                "email_id" : _source["id"],
                "original_ingest_id": _source["ingest_id"],
                "original_case_id": _source["case_id"],
                "original_alt_ref_id": _source["alt_ref_id"],
                "original_label": _source["label"],
                "datetime": _source["datetime"],
                "from" : ';'.join(_source.get("senders","")),
                "to" : ';'.join(_source.get("tos","")),
                "cc" : ';'.join(_source.get("ccs","")),
                "bcc" : ';'.join(_source.get("bccs","")),
                "subject" : _source.get("subject","")
            }
            for attachment in _source["attachments"]:
                attachment_entry = email_entry.copy()
                attachment_entry["attachment_id"] = attachment["guid"]
                attachment_entry["filename"] = attachment["filename"]
                attachment_entry["content_encrypted"] = attachment["content_encrypted"]
                attachment_entry["content_type"] = attachment["content_type"]
                email_attachments.append(attachment_entry)
    except KeyError as ke:
        tangelo.log("_query_email_attachments.Query FAILED id={0}  - KeyError={1}".format(_source["id"], ke))
    return email_attachments

# returns {"total":n "hits":[]}
def _query_emails(index, size, emails_query, additional_fields=[]):
    start = time.time()
    emails_resp = es().search(index=index, doc_type="emails", size=size, fields=get_graph_row_fields() + additional_fields, body=emails_query)
    tangelo.log("es_query_utils._query_emails(total document hits = %s, TIME_ELAPSED=%g)" % (emails_resp["hits"]["total"],time.time()-start))

    return {"total":emails_resp["hits"]["total"], "hits":[_map_emails(hit["fields"])for hit in emails_resp["hits"]["hits"]]}
