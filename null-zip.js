// null-zip.js
// Except as otherwise noted, this code is copyright
// 2021 by Anthony W. Hursh and is released under the MIT
// license.
// CRC-32 calculations courtesy of https://stackoverflow.com/questions/18638900/javascript-crc32
// See also:  https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip-printable.html
// and: https://unix.stackexchange.com/questions/14705/the-zip-formats-external-file-attribute

// Creates zip archives without any compression. Useful if you just
// want to bundle a bunch of files together without taking the hit
// for compression time (e.g. the files are already compressed, like
// .jpg or .png images, or if your web server compresses content anyway)
// Usage:
// Initialize a zip file.

// let zipbuffer = NullZip.initZip();

// Add a text file to the zip.

// Parameters:

// filename is the file name to use. 

// text content is the text. 

// timestamp is a Unix timestamp (number of seconds since the Unix epoch, January 1, 1970). 
// If timestamp is set to null, the current time is used. 
// permissions is a Unix file permissions value. If permissions is set to null, the 
// default permissions mask of 0644 is applied.

// NullZip.addTextFileToZip(zipbuffer, filename, text content, timestamp, permissions);

// Add a binary file to the zip. 
// The difference between the two is that with addTextFileToZip, Unicode text is encoded 
// to raw bytes before adding, while addFileToZip expects data already
// in the form of raw bytes. addTextFileToZip calls addFileToZip after encoding the data. 
// Again, timestamp and permissions are set to default if the value is null.

// NullZip.addFileToZip(zipbuffer, filename, binary content, timestamp, permissions);

// Finalize a zip. Returns the completed zip file as binary data.
// NullZip.finalizeZip(zipbuffer);


let NullZip = {}
NullZip.makeCRCTable = function(){
    var c;
    var crcTable = [];
    for(var n = 0; n < 256; n++){
        c = n;
        for(var k = 0; k < 8; k++){
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}

NullZip.crc32 = function(data) {
    var crcTable = NullZip.crcTable || (NullZip.crcTable = NullZip.makeCRCTable());
    var crc = 0 ^ (-1);
    for (var i = 0; i < data.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
};

NullZip.initZip = function(){
  return new Array();
}

// Generate an entry for the zip central directory
NullZip.generateZipCentralRecord = function(zipentry){
  // Lots of fields are zeros, save a bit of time by making this a constant.
  let twonull = new Uint8Array([0x0,0x0]);
  let centralRecord = new Uint8Array(46 + zipentry.uname.length);
  // Magic number for a central directory file header
  let centralRecordId = new Uint8Array([0x50,0x4b,0x01,0x02])
  centralRecord.set(centralRecordId);
  // Zip version
  centralRecord.set(new Uint8Array([0x14,0x3]),4);
  // Zip version needed to unzip
  centralRecord.set(new Uint8Array([0x14,0x0]),6);
  // No flags
  centralRecord.set(twonull,8);
  // No compression
  centralRecord.set(twonull,10);
  // Modification time
  centralRecord.set(zipentry.utime,12);
  // Modification date
  centralRecord.set(zipentry.udate,14);
  // CRC-32 value
  centralRecord.set(zipentry.ucrc,16);
  // Compressed size (same as uncompressed in this case)
  centralRecord.set(zipentry.udata_length,20);
  // Uncompressed size (same as compressed size)
  centralRecord.set(zipentry.cdata_length,24);
  // Length of file name
  centralRecord.set(zipentry.uname_length,28);
  // Extra field length (there isn't one)
  centralRecord.set(twonull,30);
  // File comment length (there isn't one)
  centralRecord.set(twonull,32);
  // Disk number (0)
  centralRecord.set(twonull,34);
  // Internal attributes (there aren't any)
  centralRecord.set(twonull,36);
  // In Unix zip, the external attributes contain the Unix
  // file permissions and file type. We use 0x8000 for the
  // type, as that's the only thing that really makes sense
  // (the other types are for things like sockets, etc.).
  let external_attributes = zipentry.permissions | 0x8000
  centralRecord.set([0,0,external_attributes & 0xff, (external_attributes & 0xff00) >> 8],38);
  // Offset to actual data from beginning of file (set to
  // zero for now, filled in later)
  centralRecord.set(twonull,42);
  centralRecord.set(twonull,44);
  // The file name.
  centralRecord.set(zipentry.uname,46)
  return centralRecord;
}
NullZip.finalizeZip = function(zipbuffer){
  let ziplength = 0;
  let centralRecords = [];
  let centralRecord;
  let nfiles = zipbuffer.length;
  for(var i = 0; i < nfiles; i++){
    // Generate a central directory file header for each file.
    centralRecord = NullZip.generateZipCentralRecord(zipbuffer[i])
    ziplength = ziplength + zipbuffer[i].record.length + centralRecord.length;
    centralRecords.push(centralRecord);
  }
  // Need to account for the "End of central directory" marker, which is 22 bytes long.
  ziplength = ziplength + 22;
  let final_zip_buffer = new Uint8Array(ziplength);
  let final_zip_offset = 0;
  // fileOffsetArr is used for the file offset in the output, so we
  // can patch the central directory entry.
  let fileoffsetArr;
  for(var i = 0; i < nfiles; i++){
    // Basically just copy the data to the output zip, as there
    // is no compression.
    final_zip_buffer.set(zipbuffer[i].record,final_zip_offset);
    // Calculate the file offset in little-endian byte format
    // and patch the central directory record.
    fileoffsetArr = [];
    fileoffsetArr.push(final_zip_offset & 0xff);
    fileoffsetArr.push((final_zip_offset >> 8) & 0xff);
    fileoffsetArr.push((final_zip_offset >> 16) & 0xff);
    fileoffsetArr.push((final_zip_offset >> 24) & 0xff);
    (centralRecords[i]).set(new Uint8Array(fileoffsetArr),42);
    final_zip_offset = final_zip_offset + zipbuffer[i].record.length;
  }
  // All files written, now write the central directory entries.
  let centralRecordStart = final_zip_offset;
  for(var i = 0; i < centralRecords.length; i++){;
    final_zip_buffer.set(centralRecords[i],final_zip_offset);
    final_zip_offset = final_zip_offset + centralRecords[i].length;
  }
  // Now write the "end of central directory record" magic number
  let centralRecordEnd = final_zip_offset;
  let centralRecordLength = centralRecordEnd - centralRecordStart;
  let endOfCentralRecord = new Uint8Array(22);
  endOfCentralRecord.set([0x50,0x4b,0x05,0x06,0x0,0x0,0x0,0x0, nfiles & 0xff,(nfiles >> 8) & 0xff, nfiles & 0xff,(nfiles >> 8) & 0xff, centralRecordLength & 0xff,(centralRecordLength >> 8) & 0xff,(centralRecordLength >> 16) & 0xff,(centralRecordLength >> 24) & 0xff,  centralRecordStart & 0xff,(centralRecordStart >> 8) & 0xff,(centralRecordStart >> 16) & 0xff,(centralRecordStart >> 24) & 0xff,0x0,0x0]);
  final_zip_buffer.set(endOfCentralRecord,final_zip_offset)
  return final_zip_buffer;
}

// Add a text file to a zip buffer. Handles encoding Unicode.
// The timestamp is the Unix timestamp in seconds or null for
// the current time. Note that while Unix supports timestamps back to
// January 1, 1970, zip only supports dates back to 1980.
// Permissions should be the Unix file permission mask or null for
// the default (0644).
NullZip.addTextFileToZip = function(zipbuffer, filename,textdata, timestamp, permissions){
  timestamp = timestamp || (new Date()).getTime() / 1000;
  permissions = permissions || 0644;
  // Encode the text so this (hopefully) handles Unicode.
  return NullZip.addFileToZip(zipbuffer,filename,new TextEncoder().encode(textdata), timestamp, permissions)
}
// Add a binary file to a zip buffer.
// The timestamp is the Unix timestamp in seconds or null for
// the current time. Note that while Unix supports timestamps back to
// January 1, 1970, zip only supports dates back to 1980.
// Permissions should be the Unix file permission mask or null for
// the default (0644).
NullZip.addFileToZip = function(zipbuffer,filename,dataArray,timestamp,permissions){
  timestamp = timestamp || (new Date()).getTime() / 1000;
  permissions = permissions || 0644; // The default, corresponds to -rw-r--r--
  let zipEntry = {};
  let nameArray = new TextEncoder().encode(filename);
  zipEntry.uname = nameArray;
  let zipOffset = 0;
  let zippedFile = new Uint8Array(nameArray.length + dataArray.length + 30);
  // Zip ID header
  let zipID = new Uint8Array([0x50,0x4b,0x03,0x04, 0x14,0x0, 0x0,0x0, 0x0,0x0]);
  zippedFile.set(new Uint8Array(zipID));
  zipOffset = zipOffset + 10;
  let fileTime = new Date(timestamp * 1000); // JS wants the time in milliseconds rather than the Unix seconds.
  // Calculate the zip time and date fields in the proper little-endian
  // order and write them to the buffer.
  let dateArr = [];
  let timeArr = [];
  let timebytes = Math.round((fileTime.getSeconds() / 2) & 0x1f);
  timebytes = timebytes | ((fileTime.getMinutes() & 0x3f) << 5);
  timebytes = timebytes | ((fileTime.getHours() & 0x1f) << 11);
  timeArr.push(timebytes & 0xff);
  timeArr.push((timebytes >> 8) & 0xff);
  let datebytes = (fileTime.getDate() & 0x1f);
  datebytes = datebytes | (((fileTime.getMonth() + 1) & 0xf)  << 5);
  datebytes = datebytes | (((fileTime.getFullYear() - 1980) & 0x3f) << 9);
  dateArr.push(datebytes & 0xff);
  dateArr.push((datebytes >> 8) & 0xff);
  let utime = new Uint8Array(timeArr);
  let udate = new Uint8Array(dateArr)
  zippedFile.set(utime,zipOffset);
  zipOffset = zipOffset + 2;
  zippedFile.set(udate,zipOffset);
  zipOffset = zipOffset + 2;
  // We also save these in object properties because we'll
  //  need them for the central directory record later.
  zipEntry.utime = utime;
  zipEntry.udate = udate;

  zipEntry.permissions = permissions;
  // Calculate the CRC-32 and write it to the buffer.
  let crc = NullZip.crc32(dataArray);
  let crcArr = []
  crcArr.push(crc & 0xff);
  crcArr.push((crc >> 8) & 0xff);
  crcArr.push((crc >> 16) & 0xff);
  crcArr.push((crc >> 24) & 0xff);
  let ucrc = new Uint8Array(crcArr)
  zippedFile.set(ucrc,zipOffset);
  // Also save it as an object property, will need again for the central
  // directory entry later.
  zipEntry.ucrc = ucrc;
  zipOffset = zipOffset + 4;
  // Calculate the compressed and uncompressed lengths in
  // little-endian order (they are the same, in this case)
  let unclength = dataArray.length;
  let dataLengthArr = [];
  dataLengthArr.push(unclength & 0xff);
  dataLengthArr.push((unclength >> 8) & 0xff);
  dataLengthArr.push((unclength >> 16) & 0xff);
  dataLengthArr.push((unclength >> 24) & 0xff);
  let udata_length = new Uint8Array(dataLengthArr)
  zippedFile.set(udata_length,zipOffset);
  // Again, save this as an object property because we'll
  // need it for the central directory record later.
  zipEntry.udata_length = udata_length;
  zipOffset = zipOffset + 4;
  // Compressed length is the same as uncompressed since we're not doing compression, so we just repeat the previous;
  zippedFile.set(udata_length,zipOffset);
  // Save as object property for central directory record later.
  // We could reuse udata_length, but best
  // to keep a separate value in case 
  // compression is added later.
  zipEntry.cdata_length = udata_length;
  zipOffset = zipOffset + 4;
  // File name length
  let namelength = nameArray.length;
  let nameLengthArr = [];
  nameLengthArr.push(namelength & 0xff);
  nameLengthArr.push((namelength >> 8) & 0xff);
  let uname_length = new Uint8Array(nameLengthArr)
  zippedFile.set(uname_length,zipOffset);
  zipOffset = zipOffset + 2;
  zipEntry.uname_length = uname_length;
  // Extra field length (zero in this case)
  let uextra_length = new Uint8Array([0,0]);
  zippedFile.set(uextra_length,zipOffset);
  zipEntry.uextra_length = uextra_length;
  zipOffset = zipOffset + 2;
  zippedFile.set(nameArray,zipOffset);
  zipOffset = zipOffset + namelength;
  zippedFile.set(dataArray,zipOffset);
  zipEntry.record = zippedFile;
  zipbuffer.push(zipEntry);
  return zipbuffer;
}
