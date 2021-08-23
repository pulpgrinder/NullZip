# NullZip
Simple JavaScript library for producing ZIP archives without compression. 

This is useful when you want to bundle a bunch of files but don't want to take the performance hit for compression (or just don't care about compression).

Examples:

* The files are already compressed (e.g., most image files).
* The files are being served by a web server that automatically compresses files anyway.
* You're zipping a group of related text files, and want to maintain greppability.
* Something downstream wants uncompressed files in a zip archive (e.g., EPUB ebooks).


Usage:

See test.html in the test folder for a working example.
