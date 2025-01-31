//
// ### XML-RPC method call constructor
//
// Expects a method name and list of parameters:
//
//     let msg = new XMLRPC.Call(
//         'test.echo',
//         [ "one", "two", "three" ]
//     );
//     let xml = msg.xml();
//
function XMLRPCMessage(methodname, params) {
  this.method = methodname || 'system.listMethods';
  this.params = params || [];
  return this;
}

XMLRPCMessage.prototype.xml = function () {
  let xml = '<?xml version="1.0"?>\n';

  if (this.method) {
    xml += '<methodCall>\n';
    xml += '<methodName>' + this.method + '</methodName>\n';
  } else {
    xml += '<methodResponse>\n';
  }

  if (!this.is_fault) {
    xml += '<params>\n';
  } else {
    xml += '<fault>\n';
  }

  for (let i = 0; i < this.params.length; i++) {
    if (!this.is_fault) {
      xml += '<param>\n';
    }
    xml += '<value>' + this.getParamXML(this.params[i]) + '</value>\n';
    if (!this.is_fault) {
      xml += '</param>\n';
    }
  }

  if (!this.is_fault) {
    xml += '</params>\n';
  } else {
    xml += '</fault>\n';
  }

  if (this.method) {
    xml += '</methodCall>';
  } else {
    xml += '</methodResponse>';
  }

  return xml;
};

// Dispatch to generate the XML appropriate for a given data type.
XMLRPCMessage.prototype.getParamXML = function (data) {
  let xml;
  const type = this.dataTypeOf(data);
  switch (type) {
    case 'date':
      xml = this.toDateXML(data);
      break;
    case 'array':
      xml = this.toArrayXML(data);
      break;
    case 'struct':
      xml = this.toStructXML(data);
      break;
    case 'boolean':
      xml = this.toBooleanXML(data);
      break;
    default:
      xml = this.toValueXML(type, data);
      break;
  }
  return xml;
};

XMLRPCMessage.prototype.dataTypeOf = function (o) {
  let type = typeof o;
  type = type.toLowerCase();
  switch (type) {
    case 'number':
      if (Math.round(o) === o) type = 'i4';
      else type = 'double';
      break;
    case 'object':
      if (o.constructor === Date) type = 'date';
      else if (o.constructor === Array) type = 'array';
      else type = 'struct';
      break;
  }
  return type;
};

XMLRPCMessage.prototype.toValueXML = function (type, data) {
  const xml = '<' + type + '>' + data + '</' + type + '>';
  return xml;
};

XMLRPCMessage.prototype.toBooleanXML = function (data) {
  const value = data === true ? 1 : 0;
  const xml = '<boolean>' + value + '</boolean>';
  return xml;
};

XMLRPCMessage.prototype.toDateXML = function (data) {
  let xml = '<dateTime.iso8601>';
  xml += this.dateToISO8601(data);
  xml += '</dateTime.iso8601>';
  return xml;
};

XMLRPCMessage.prototype.toArrayXML = function (data) {
  let xml = '<array><data>\n';
  for (let i = 0; i < data.length; i++) {
    xml += '<value>' + this.getParamXML(data[i]) + '</value>\n';
  }
  xml += '</data></array>\n';
  return xml;
};

XMLRPCMessage.prototype.toStructXML = function (data) {
  let xml = '<struct>\n';
  for (const i in data) {
    xml += '<member>\n';
    xml += '<name>' + i + '</name>\n';
    xml += '<value>' + this.getParamXML(data[i]) + '</value>\n';
    xml += '</member>\n';
  }
  xml += '</struct>\n';
  return xml;
};

XMLRPCMessage.prototype.dateToISO8601 = function dateToISO8601(
  dateIn,
  format,
  offset
) {
  /* accepted values for the format [1-6]:
     1 Year:
       YYYY (eg 1997)
     2 Year and month:
       YYYY-MM (eg 1997-07)
     3 Complete date:
       YYYY-MM-DD (eg 1997-07-16)
     4 Complete date plus hours and minutes:
       YYYY-MM-DDThh:mmTZD (eg 1997-07-16T19:20+01:00)
     5 Complete date plus hours, minutes and seconds:
       YYYY-MM-DDThh:mm:ssTZD (eg 1997-07-16T19:20:30+01:00)
     6 Complete date plus hours, minutes, seconds and a decimal
       fraction of a second
       YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45+01:00)
    */
  let date;
  if (!format) {
    format = 6;
  }
  if (!offset) {
    offset = 'Z';
    date = dateIn;
  } else {
    const d = offset.match(/([-+])([0-9]{2}):([0-9]{2})/);
    let offsetnum = Number(d[2]) * 60 + Number(d[3]);
    offsetnum *= d[1] === '-' ? -1 : 1;
    date = new Date(Number(Number(dateIn) + offsetnum * 60000));
  }

  const zeropad = function (num) {
    return (num < 10 ? '0' : '') + num;
  };

  let str = '';
  str += date.getUTCFullYear();
  if (format > 1) {
    str += '-' + zeropad(date.getUTCMonth() + 1);
  }
  if (format > 2) {
    str += '-' + zeropad(date.getUTCDate());
  }
  if (format > 3) {
    str +=
      'T' + zeropad(date.getUTCHours()) + ':' + zeropad(date.getUTCMinutes());
  }
  if (format > 5) {
    const secs = Number(
      date.getUTCSeconds() +
      '.' +
      (date.getUTCMilliseconds() < 100 ? '0' : '') +
      zeropad(date.getUTCMilliseconds())
    );
    str += ':' + zeropad(secs);
  } else if (format > 4) {
    str += ':' + zeropad(date.getUTCSeconds());
  }

  if (format > 3) {
    str += offset;
  }
  return str;
};

export default XMLRPCMessage;
