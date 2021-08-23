# NullZip
Simple JavaScript library for producing ZIP archives without compression. 

This is useful when you want to bundle a bunch of files but don't want to take the performance hit for compression (or just don't care about compression).

Examples:

* The files are already compressed (e.g., most image files).
* The files are being served by a web server that automatically compresses files anyway.
* You're zipping a group of related text files, and want to maintain greppability.
* Something downstream wants uncompressed files in a zip archive (e.g., EPUB ebooks).


Usage:

```JavaScript
// Initialize a zip file.

let zipbuffer = NullZip.initZip();

// Add a text file to the zip.

// Parameters:

// filename is the file name to use. 

// text content is the text. 

// timestamp is a Unix timestamp (number of seconds since the Unix epoch, January 1, 1970). 
// If timestamp is set to null, the current time is used. 

// permissions is a Unix file permissions value. If permissions is set to null, the 
// default permissions mask of 0644 is applied.

NullZip.addTextFileToZip(zipbuffer, filename, text content, timestamp, permissions);

// Add a binary file to the zip. 
// The difference between the two is that with addTextFileToZip, Unicode text is encoded 
// to raw bytes before adding, while addFileToZip expects data already
// in the form of raw bytes. addTextFileToZip calls addFileToZip after encoding the data. 
// Again, timestamp and permissions are set to default if the value is null.

NullZip.addFileToZip(zipbuffer, filename, binary content, timestamp, permissions);

// Finalize a zip. Returns the completed zip file as binary data.
NullZip.finalizeZip(zipbuffer);
```

See test.html in the test folder for a working example.
