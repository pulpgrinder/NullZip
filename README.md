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
// Initialize a zip file
let zipbuffer = NullZip.initZip();

// Add a text file to the zip. The timestamp and permissions parameters are optional. If timestamp is not present (or is set to null)
// the current time is used. If permission is not present (or is set to null), Unix 0644 permissions are applied. 
NullZip.addTextFileToZip(zipbuffer, filename, filecontent, timestamp, permissions);

// Add a binary file to the zip. The difference between the two is that with addTextFileToZip, Unicode text is encoded to raw bytes
// before adding, while addFileToZip wants data already in the form of raw bytes. addTextFileToZip calls addFileToZip after encoding
// the data. Again, timestamp and permissions are optional.
NullZip.addFileToZip(zipbuffer, filename, binary content, timestamp, permissions);

// Finalize a zip. Returns the completed zip file as binary data.
NullZip.finalizeZip(zipbuffer);
```

See test.html in the test folder for a working example.
