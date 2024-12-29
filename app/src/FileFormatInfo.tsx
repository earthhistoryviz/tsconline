import React from "react";
import { observer } from "mobx-react-lite";
import patternWidthExample from "./file_format_guide_images/patternWidthExample.png";
import transect_ex1 from "./file_format_guide_images/transect_ex1.png";
import transect_load_template_with_error from "./file_format_guide_images/transect_load_template_with_error.png";
import transect_save_template from "./file_format_guide_images/transect_save_template.png";
import transect_template_missing_point from "./file_format_guide_images/transect_template_missing_point.png";
import transect_template_space_merged from "./file_format_guide_images/transect_template_space_merged.png";
import transect_template_space from "./file_format_guide_images/transect_template_space.png";
import transect_template_with_error from "./file_format_guide_images/transect_template_with_error.png";
import transect_template from "./file_format_guide_images/transect_template.png";

export const FileFormatInfo: React.FC = observer(() => {
  const htmlContent = `
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta http-equiv="Content-Type" content="text/html"/>
            <title>Time Scale Creator File Format Guide</title>
        </head>
        <style>
        body {
            margin: 60px; /* Adds margin to the body element */
        }
    </style>
        <body>
<p>The TSCreator file format is structured as a tab-delimited text file. The tabs are used to separate cells, each cell containing some data. This structure means that the datafiles can be opened directly in a spreadsheet program like Excel or OpenOffice.org Calc. This is recommended because the cells will then neatly aligned. When done editing, save the file as a tab-delimited text file.</p>
<p><strong>Note:</strong> TSCreator supports non-English characters through the Unicode character set (UTF-8 or UTF-16).</p>
<h1>General layout</h1>
<p>The datafile starts with a header, followed by the data columns. The header is separated from the data columns by a blank line. The columns are also separarated from each other by a blank line. No data column definition can have any blank lines.</p>
<p>Each line has several cells, each separated by a tab. A spreadsheet program will automatically place tabs for you between cells. The rest of this guide will assume that the file is being edited by a spreadsheet program.</p>
<p>For the rest of the guide, words appearing in CAPS surrounded by &lt;angle brackets&gt; mean text that you enter.<br />
Required cells are marked with a red asterisk: <font color="red">*</font>required </p>
<p>All features in this file are available as of TSC PRO 1.3.5. If a feature requires a later version, the required version is marked  in blue superscript: <sup><font color="#0000FF">1.4</font></sup></p>
<h2>File Header</h2>
<p>Every data file must begin with a header which includes some information about the datafile. The header consists of the following lines:</p>
<table width="200" border="1">
  <tr>
    <td><font color="red">*</font>format&nbsp;version:</td>
    <td>&lt;VERSION&gt;</td>
  </tr>
  <tr>
    <td><font color="red">*</font>date:</td>
    <td>&lt;DATE&gt;</td>
  </tr>
  <tr>
    <td>age&nbsp;units:</td>
    <td>&lt;UNITS&gt;</td>
  </tr>
  <tr>
    <td>default&nbsp;chronostrat:</td>
    <td>USGS&nbsp;or&nbsp;UNESCO</td>
  </tr>
  <tr>
    <td>chart&nbsp;title:<sup><font color="#0000FF">1.4</font></sup></td>
    <td>A title for the chart</td>
  </tr>
</table>
</p>
<p>&lt;VERSION&gt; is the version of the datafile format, NOT of TSCreator. As functionality is added to TSC we have to increment this number. Currently use &quot;1.5&quot; <font color="red">*required</font><br />
&lt;DATE&gt; is the date of the datapack, in mm/dd/yyyy format.  <font color="red">*required</font><br />
&lt;UNITS&gt; refers to the unit of the data columns' age value. The default is Myr. For core samples you can use m (meters) or ft (feet) or any unit you deem appropriate.  <br />
The default chronostrat is the default option for the color scheme used to color periods, epochs, stages, etc. The two choices are USGS and World Geol. Map (Paris) (default). </p>

<h3>Example:</h3><br />
<pre>
format version:	1.5
date:	04/01/2009
age units:	m
default chronostrat:	USGS
</pre>

<h2>Groups</h2>
<p>Data columns can be grouped together under one heading using a meta or grouping column.

  <br />
  A grouping  is created on a single line:</p>
<table border="1">
  <tr>
    <td><font color="red">*</font>&lt;GROUP&nbsp;TITLE&gt; </td>
    <td>&nbsp;&nbsp;<font color="red">*</font>:&nbsp;&nbsp;</td>
    <td><font color="red">*</font>&lt;CHILD&nbsp;COLUMN&nbsp;1&gt; </td>
    <td>&lt;CHILD&nbsp;COLUMN&nbsp;2&gt; </td>
    <td>&lt;CHILD&nbsp;COLUMN&nbsp;3&gt; </td>
	<td align="center">_METACOLUMN_OFF<br />or<br />_METACOLUMN_ON</td>
	<td align="center">_TITLE_OFF<sup><font color="#0000FF">1.5</font></sup><br />or<br />_TITLE_ON</td>
	<td>&nbsp;&nbsp;</td>
	<td>&lt;POPUP&gt;</td>
  </tr>
</table>
<p>&lt;GROUP TITLE &gt; is the name of the group. <font color="red">*required</font><br />
The second cell must contain just a colon (:) <font color="red">*required</font><br />
  Next follows a list of the columns belonging to this group. There can be as many as needed, including other groups. <font color="red">*At least one child column is required</font><br />
  By default, groups are on. A group can be turned off by adding a _METACOLUMN_OFF as if it were a child column. To include the group or any of its child columns in the generated chart the user will have to enable it in TSC's Settings. _METACOLUMN_ON explicitly says to make the group on. <br />
  _TITLE_OFF can be used to turn off displaying the title on the generated chart. The title will still appear in the Settings. Default is _TITLE_ON<br />
A popup can be included at the end of the line by leaving a blank cell in a spreadsheet, or two consecutive tabs in a text editor, followed by the text of the popup. See below for more on popups. </p>
<h3>Example:</h3>
<pre>
Standard Chronostratigraphy	:	Era	Period	Series	Stage	Substage
</pre>
<p>&nbsp;</p>
<h1>Data Columns</h1>
<h2>File Header</h2>
<p>Every data column begins with a one-line header, followed by the column data. Some columns have additional, optional, headers.<br />
  The format of this universal header is: </p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td><font color="red">*</font>&lt;TYPE&gt;</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>
<p>&lt;TITLE&gt; is the name of the column. <font color="red">*required</font><br />
&lt;TYPE&gt; is the type of the column. This has to match one of the types below. <font color="red">*required</font><br />
&lt;WIDTH&gt; is the width of the column, in SVG units. These are analogous to pixels, but not exactly. The default for most columns is 100.<br />
  &lt;COLOR&gt; is the background color of the column, specified as red/green/blue where each color is an integer value from 0 to 255. For example, an aqua background would be 0/255/255.<br />
  By default, the title (specified by &lt;TITLE&gt;) will be shown on the chart. Sometimes it is prefered that it isn't, and this can be done by including a &quot;notitle&quot; (without the quotes) in this cell.<br />
  &lt;POPUP&gt; is the popup text. See information about popups below.</p>
<p>
<a name="top">
<h2>Specifying interval-based data: the TOP approach</h2>
Some columns (ex. block, chron, facies, range) display data that is inherently an interval. For all such cases the TSCreator approach is for each datapoint to specify only the base of the interval. The top of the interval is taken to be the base of the previous interval. Of course this requires specifying the top of the topmost interval. This is done using a label &quot;TOP&quot;. The specified age will then be used as the top of the first interval.<br />
It is also possible to have gaps in the column by having another &quot;TOP&quot; anywhere in the column. </p>
</a>
<h2>Block columns</h2>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td><font color="red">*</font>block</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>

<p>Following the header is the actual data. The base age of each block is specified on its own line:</p>
<table border="1">
	<tr>
		<td><font color="red">*</font></td>
		<td><font color="red">*</font>&lt;LABEL&gt;</td>
		<td><font color="red">*</font>&lt;AGE&gt;</td>
		<td>&lt;LINESTYLE&gt;</td>
		<td>&lt;POPUP&gt;</td>
		<td>&lt;COLOR&gt;<sup><font color="#0000FF">1.4</font></sup></td>
	</tr>
</table>

<p>Note that the line begins with an empty cell (or a tab in a text editor). </p>
<p>&lt;LABEL&gt; is the label that goes inside the block. <font color="red">*required</font><br />
  &lt;AGE&gt; is the base age of the block. <font color="red">*required</font><br />
  &lt;LINESTYLE&gt; specifies the type of line at the base of the block. It can be one of the following:
<ul>
  	<li>solid</li>
	<li>dashed</li>
	<li>dotted</li>
</ul>
<p><br />
  &lt;POPUP&gt; see below for information about popups.
</p>
</p>
<p>&lt;COLOR&gt; is the background color of that particular cell, and that cell only. It can be specified as &quot;r/g/b&quot; where each of r,g,b is an integer from 0 to 255 representing red, green, and blue, respectively. </p>
<p>The first row in a block column should specify the TOP of the first block, see the <a href="#top">note above about TOPs</a>. </p>
<h3>Examples:</h3>
<pre>
Period	block		USGS-Named		off
	TOP	145.5
	Jurassic	199.6	2


Series	block	120	USGS-Named	notitle
	TOP	145.5
	Late	199.6	2	Lower Jurassic is my popup
</pre>


<h2>Chron columns</h2>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td><font color="red">*</font>chron</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>
<p>Chron columns are often displayed in three columns on the chart. The leftmost shows the polarity, and middle is a block column which shows the LABEL, and the rightmost is a block column which shows the SERIES. All three are automatically created based on the data below.<br />
It is possible to NOT automatically generate the two block columns by specifying &quot;chron-only&quot; as the column type instead of &quot;chron&quot;.  <sup><font color="#0000FF">1.4</font></sup></p>
<p>Before any data is given we need to establish what series the data is in. This is done using a line like the following. The series can be changed at any time.</p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;SERIESNAME&gt;</td>
		<td>(leave blank)</td>
		<td>&lt;WIDTH&nbsp;OF&nbsp;SERIES&nbsp;COL&gt;</td>
	</tr>
</table>
<p>&lt;SERIESNAME&gt; is the name of the series.<font color="red">*required</font> If you would like to stop a series, begin a new one with &lt;SERIESNAME&gt; just a space, or in <sup><font color="#0000FF">1.4</font></sup> you can use the string &quot;BASE&quot; (no quotes). <br />
  For historical reasons leave the next cell blank (two tabs in a row in a text editor).<br />
  &lt;WIDTH OF SERIES COL&gt; allows you to set the width of the rightmost block column which shows the series. </p>
<p>The actual data can now follow:</p>
<table border="1">
	<tr>
		<td><font color="red">*</font></td>
		<td><font color="red">*</font>&lt;POLARITY&gt;</td>
		<td>&lt;LABEL&gt;</td>
		<td><font color="red">*</font>&lt;AGE&gt;</td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>

<p>Note the blank cell at the start of the line.<br />
  &lt;POLARITY&gt; can be:
  <font color="red">*required</font>
<ul>
	<li>TOP - see the <a href="#top">note above about TOPs</a> </li>
	<li>N - Black </li>
	<li>R - White </li>
	<li>U or No Data - a crosshatch pattern </li>
</ul>
&lt;LABEL&gt; will be placed in the middle block column right beside the polarity. If multiple adjacent lines have identical &lt;LABEL&gt;, then they will be merged in the block column. The label can be blank (empty cell, or two tabs in a text editor). <br />
&lt;AGE&gt; is the base age.<font color="red">*required</font><br />
&lt;POPUP&gt; will appear in the leftmost chron column. See below for more information about popups.
<br />
<h3>Examples:</h3>
<pre>
Geomagnetic Polarity	chron
Austria series		Hettangian magnetic polarity intervals are not correlated to ammonite zones.  Pattern is schematic only.
	TOP		202
	N		202.47
	R		204.18
	R		204.56
	No Data		205.7
Newark Basin series		Series_Popup_text
	TOP		206
	N	l+	206.66
	N	j+	213.5
	R	i-	215.852
	N	h+	218.348
	R	g-	219.668		Data popup text
	N	f+	220.82
	R	e-	221.445
	N	d+	222.229
</pre>
<br />

<h2>Facies columns</h2>
<p>Facies columns are exactly the same as CHRON COLUMNS, except the column type is "facies" instead of "chron" and &lt;POLARITY&gt; can be:
<ul>
	<li>TOP - exactly like in a chron column</li>
	<li>A facies pattern name. This name can by any name appearing in the View Loaded Patterns dialog box in the File menu of TSCreator.</li>
</ul>

 <p>Similarly to chron columns, it is possible to NOT automatically generate the two companion block columns by specifying &quot;facies-only&quot; as the column type instead of &quot;facies&quot;. <sup><font color="#0000FF">1.4</font></sup></p>
 <h2>Facies column pattern widths</h2>
 <table border="0">
 <tr>
	 <td><img src="${patternWidthExample}" alt="pattern width example" width="155" height="326" /><br />Example of pattern widths</td>
    <td valign="top">
 <p>Facies columns show the grain size by varying the width of the box containing the pattern like in the example on the left. </p>
 <p> The patterns built into TSCreator already have widths associated with them. These widths are changeable by specifying them in the datafile. Note that pattern widths are global throughout TSCreator, so changing them in one datafile will also change them in all currently loaded columns.</p>
 <p>The widths are specified in a manner similar to a data column. First comes a header:  </p>
 <table border="1">
	<tr>
		<td><font color="red">*</font>patternwidths</td>
		<td><font color="red">*</font>patternwidths</td>
	</tr>
</table>
 <p>Followed by the pattern name and its width: </p>
 <table border="1">
	<tr>
		<td><font color="red">*</font>&nbsp;</td>
		<td><font color="red">*</font>&lt;PATTERN&nbsp;NAME&gt;</td>
		<td><font color="red">*</font>&lt;PATTERN&nbsp;WIDTH&gt; </td>
	</tr>
</table>
 <p>&lt;PATTERN NAME&gt; is the facies pattern name, like in the facies column.<br />
   &lt;PATTERN WIDTH&gt; is the width of the pattern, as a percentage of the column width. Valid values are from 0 to 100. We do not recommend using a value less than 50
 because that can make the pattern hard to see if the user makes the column narrow. </p>
 <h3>Example:</h3>
<pre>
patternwidths	patternwidths
	Halite	70
	Gypsum-Anhydrite	75
	Evaporite	72.5
	Saline	72.5
	Brackish	75
	Soil	70
	Coal	80
	Pelagic_marl	80
	Shallow-marine_marl	80
</pre>
 </td>
 </tr>
 </table>
 <h2>Event columns (LAD/FAD/EVENT)</h2>


<p>Event columns are used to show the First appearance of something (FAD), the Last appearance of something (LAD), or an Event.</p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td><font color="red">*</font>event</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>

<p><strong>Deviations from column defaults: </strong><br />
  The default &lt;WIDTH&gt; of an Event column is 150.<br />
  By default, event columns are OFF. To specify one to be on, use the &quot;on&quot; keyword in the appropriate cell as shown above.
</p>
<p>The three types of data an Event column can display are split into three sections. Each section is optional, but at least one must exist. Each section has a header: </p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TYPE&gt;</td>
	</tr>
</table>
<p>Where &lt;TYPE&gt; can be one of the following: <font color="red">*required</font></p>
<ul>
  <li>LAD - Last appearance: arrow points down </li>
  <li>FAD - First appearance: arrow points up </li>
  <li>EVENT - single event, arrow points to the side </li>
</ul>
<p>After the type, the points follow: </p>
<table border="1">
	<tr>
		<td><font color="red">*</font></td>
		<td><font color="red">*</font>&lt;LABEL&gt;</td>
		<td><font color="red">*</font>&lt;AGE&gt;</td>
		<td>&lt;LINESTYLE&gt;</td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>


<p>Note that the line begins with an empty cell (or a tab in a text editor). </p>
<p>&lt;LABEL&gt; is the label that goes inside the block. <font color="red">*required</font><br />
  &lt;AGE&gt; is the base age of the block. <font color="red">*required</font><br />
  &lt;LINESTYLE&gt; specifies the type of line at the base of the block. It can be one of the following:
<ul>
  	<li>solid</li>
	<li>dashed</li>
	<li>dotted</li>
</ul><br />
  &lt;POPUP&gt; see below for information about popups. </p>
<h3>Example:</h3>
<pre>
FAD/LAD	event	200	nocolor
LAD
	Limbosporites lundbladii	205.7
	A. laevigatus	205.7
	R. tuberculatus	205.7	some popup text
	G. rudis	206.97
FAD
	V. ignacii (common)	210.98
	U. imperialis	249.9
</pre>

<br />
<h2>Range columns</h2>
<p>Range columns show ranges. For example, when a certain critter lived and how its abundance changed over time. </p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td><font color="red">*</font>range</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>
<p>Note that a range colun's width is based on the number of critters in the time frame. It calculates the width that it needs. The width from the header (&lt;WIDTH&gt;) is ignored by a range column. </p>
<p>Ranges are automatically parsed from the points given next: </p>
<table border="1">
	<tr>
		<td><font color="red">*</font></td>
		<td><font color="red">*</font>&lt;LABEL&gt;</td>
		<td><font color="red">*</font>&lt;AGE&gt;</td>
		<td>&lt;ABUNDANCE&gt;</td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>
<p>Note the empty cell at the beginning of the line.</p>
<p>&lt;LABEL&gt; is the name of the critter, or whatever the range represents. <font color="red">*required</font><br />
&lt;AGE&gt; is the base age of this part of the range, or the age of a sample. <font color="red">*required</font><br />
&lt;ABUNDANCE&gt; specifies the thickness of the line that will be used to draw the range: </p>
<ul>
  <li>TOP - specifies the top of a range (default) </li>
  <li>missing - no line will be drawn </li>
  <li>rare</li>
  <li>common</li>
  <li>frequent</li>
  <li>abundant</li>
  <li>sample - a circle is drawn, sample does not contribute to a range. </li>
</ul>
Note that since ranges are intervals of time, and since &lt;AGE&gt; only specifies the base of the range, the top must be specified first. This can be done using a TOP abundance. If no TOP exists, then the topmost range point is used as a TOP.
<a href="#top">Note above about TOPs</a>
<h3>Example:</h3>
<pre>
Range	range
	donald	0
	donald	1	rare
	donald	2
	donald	3	frequent
	donald	4	flood
	mickey	3
	mickey	4	rare
	mickey	5	missing
	mickey	6	flood
	mickey	6	sample
	mickey	4.5	sample
	mickey	3.3	sample
	goofy	4
	goofy	6	abundant
	pluto	0	rare
	pluto	3	frequent
	pluto	5	flood
	minnie	5
	minnie	6	abundant
	scroodge	2
	scroodge	4	flood
	scroodge	6	frequent
</pre>

<br />
<h2>Sequence/Trend columns</h2>
<p>Sequences and Trends have identical formats except for the name of the column. The differences on the chart are a different background color, and the different drawing of severities. </p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td>sequence<br />
	      <font color="red">*</font>or<br />
      trend</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>
<p>After the column header comes the actual data. Each line is specified like this: </p>
<table border="1">
	<tr>
		<td><font color="red">*</font></td>
		<td>&lt;LABEL&gt;</td>
		<td>SB <br />
	    <font color="red">*</font>or <br />
        MFS </td>
		<td><font color="red">*</font>&lt;AGE&gt;</td>
		<td><font color="red">*</font>&lt;SEVERITY&gt;</td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>
	<p>Note the empty cell at the beginning of the line.</p>
	<p>&lt;LABEL&gt; is the label for the event, it is optional.<br />
The direction can be either:
	<font color="red">*required</font>
	<ul>
	<li>SB</li>
	<li>MFS</li>
</ul>
	  <p>&lt;AGE&gt; is as usual <font color="red">*required</font><br />
	    The Severity can be one of the following:
          <font color="red">*required</font>
<ul>
  <li>Major</li>
        <li>Medium</li>
        <li>Minor</li>
</ul>
</p>

	  <h3>Example:</h3>
<pre>
SomeSequence	sequence
	name	SB	201.5	Major
	name2	MFS	202.5	Medium	Popup text goes here.
	name3	SB	203.5	Minor
</pre>

<br />
<h2>Graph/Point columns</h2>
<p>Graph/Point columns draw an X vs. Age graph. </p>
<p>The drawing style of the graph can be selected with an optional line immediately following the main column header. </p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td><font color="red">*</font>point</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
	<tr>
		<td><font color="#009900">*</font>&lt;POINT&nbsp;TYPE&gt;</td>
		<td>line <br />
	    or<br />
	    noline </td>
		<td>&lt;FILL&nbsp;COLOR&gt; </td>
		<td>&lt;RANGE&nbsp;LOW&gt; </td>
		<td>&lt;RANGE&nbsp;HIGH&gt; </td>
		<td>smoothed</td>
	</tr>
</table>
<p>&lt;POINT TYPE&gt; is <font color="#009900">*required if the optional second line is present</font>, but can be omitted if none of the extra options are desired. It can be one of the following:
<ul>
  <li>nopoints - the points are not drawn at all</li>
  <li>rect - the points are drawn as a rectangle</li>
  <li>circle - the points are drawn as a circle</li>
  <li>cross - the points are drawn as a cross   </li>
</ul>
<p>line or noline: whether or not to draw a black line connecting the points<br />
  &lt;FILL COLOR&gt; a color specified in r/g/b format, or &quot;nofill&quot;, to fill the area between the points/line and the edge of the column.<br />
  &lt;RANGE LOW&gt; and &lt;RANGE HIGH&gt; specify the range of the graph in the X dimension. Both values must either be present or omitted. If omitted, TSCreator automatically calculates the range so that all points fit inside.<br />
  smoothed: Whether or not to smooth the line connecting the points. Smoothing is done using a Bezier curve. The smoothed curve passes through every point and maxima/minima are preserved. </p>
<p>Following the header are the points: </p>
<table border="1">
	<tr>
		<td><font color="red">*</font></td>
		<td><font color="red">*</font>&lt;AGE&gt;</td>
		<td><font color="red">*</font>&lt;X VALUE&gt; </td>
		<!---
		<td>&lt;LABEL&gt;</td>
		<td>&lt;POPUP&gt;</td>
		--->
	</tr>
</table>
	<p>Note the empty cell at the beginning of the line.</p>
	<p>&lt;AGE&gt; is the Y coordinate of the point<font color="red"> *required</font><br />
	  &lt;X VALUE&gt; is the X coordinate of the point<font color="red"> *required</font><br />
		<!---
	  &lt;LABEL&gt; is currently ignored, but will be implemented in the future. <br />
	  &lt;POPUP&gt; is currently ignored, but will be implemented in the future.--->
</p>
	<h3>Example with options:</h3>
<pre>
SomeGraph	point
nopoints	line	nofill	0	6
	205	0	mylabel	Popup text
	206	5		Popuptext
</pre>

<h3>Example without options:</h3>
<pre>
SomeGraph	point
	205	0	mylabel	Popup text
	206	5		Popuptext
</pre>

<h3>Overlapping Graph columns<sup><font color="#0000FF">1.5</font></sup></h3>
It is possible to stack several graph columns on top of each other to make a compound graph. For example, to stack two graphs one would make one graph column with one curve followed by another with the second curve. The second, "child" graph column must immediately follow the first "parent" graph column. The child's column type is "point-overlay". Both graphs will be placed on the same scale, the parent's, and the child columns will also use the parent's column options (background color, width, placement, etc). The child may specify its own point options, though, including switching from left to right side.
<pre>
CompoundGraph	point
nopoints						right
	1	10
	2	9
	3	7
	3.1	1.3
	3.9	1.1
	5	1.5
	5.3	9


CompoundGraph	point-overlay
rect	0/0/255					left
	1	8
	2	5
	3	3
	3.1	1.1
	3.9	1.0
	5	1.3
	5.3	9
</pre>
<br />
This feature became available in TSCreator 4.0.2.
<!---
*************************************************
** FREEHAND COLUMNS:

COLUMNNAME	*see below*	[WIDTH]	[COLOR]	[notitle]	[off/on]	[popup]
(primitives)

Available since TSCreator version 2.0.2 and file format 1.2.

Freehand columns let you draw arbitrary things. Currently that only includes polygons. You can draw either on a blank column or use another column as a backdrop.
Use the column type to specify this behavior:
freehand : a column dedicated to the drawing
freehand-overlay : everything in this column will be drawn ON TOP of the last column.
freehand-underlay : everything in this column will be drawn BEHIND the last column.

the last column, or "host column" is the previous column specified in the datafile. If that means a facies or chron column, then only the leftmost Facies/Chron column of the set will be drawn on (the block columns on the right will be left alone).
a "last column" can have several over and underlays.
a metacolumn (grouping column) cannot be used for this.
NOTE: While allowed, avoid using a block, event, or ageage column as a host because their contents get shuffled around depending on the user's settings. As such they are unpredictable and can result in misalignments with the freehand overlay.

Following the declaration is a list of the primitives to draw. Currently only the polygon is supported:
polygon	[closed]	[smoothed]	[PATTERN]	[STYLE]	[POPUP]
	XVAL	AGEVAL	[smoothed/sharp]		<==== data

closed: will automatically draw a line from the last point to the first
smoothed: if specified then all points will be smoothed unless "sharp" is specified for a point
          if not specified, then all points will be sharp unless "smoothed" is specified for a point
PATTERN: one of the patterns supported by the facies column.
STYLE: an SVG style. Must be specified in the SVG format. the default is like this example: "stroke-width: 0.5; stroke: black; fill: none;"
       Note that if PATTERN is specified then it will override any fill specified in the STYLE.
POPUP: a popup like all others.

The actual points are specified like this:
XVAL: the point's X value. This number should go from 0 to the column width.
AGEVAL: the points Y value, specified as an age.
smoothed/sharp: This overrides the entire polygon's smoothing option and can be used independently of it. Use this to smooth the polygon point by point.

NOTE: all points should be specified in COUNTER CLOCKWISE ORDER. Otherwise the smoothing might be backwards for the first point.


<h3>Example:</h3>
<pre>
Some Freehand	freehand
polygon	closed	smoothed	No Data		popup text goes here
	10	200
	10	202
	30	205
	40	206
	50	205
polygon	closed			fill: red;
	60	200	smooth
	60	202
	60	205
	90	206	smooth
	70	205
</pre>
--->
<br />
<h2>Blank columns</h2>
<p>A blank column is meant to leave space in the graph which is later filled in with some custom drafting.</p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td><font color="red">*</font>blank</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>

<p>Blank columns contain no data, so just the column header is sufficient. </p>
<h2>Freehand columns</h2>
<p>Freehand columns allow straight drafting and can be used to draw on top of other columns.  </p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td><font color="red">*</font>freehand</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>
<p>Note that a freehand column can also have a type of &quot;freehand-overlay&quot; or &quot;freehand-underlay&quot;. That means that this freehand column will be drawn on top of, or under, the last column specified in the datafile before this freehand column. </p>
<p><strong>Images:</strong></p>
<table border="1">
	<tr>
		<td><font color="red">*</font>image</td>
		<td><font color="red">*</font>&lt;FILENAME&gt;</td>
		<td>&lt;TOPAGE&gt;<sup><font color="#0000FF">1.4</font></sup> </td>
		<td>&lt;BASEAGE&gt;<sup><font color="#0000FF">1.4</font></sup></td>
	</tr>
</table>
	<p>&lt;FILENAME&gt; is the filename for the image file. This should be a relative path from this datafile. For example, if you put your images in a subdirectory &quot;images&quot; located in the same directory as the datafile, the path can be &quot;images/something.jpg&quot;.<br />
    Supported formats are JPG, PNG, SVG. <font color="red">*required</font></p>
	<p>If &lt;TOPAGE&gt; and &lt;BASEAGE&gt; are specified then the image is assumed to be centered both horizontally and vertically between those ages. If you'd like more control, you can use these extra two lines: </p>


<table border="1">
	<tr>
		<td><font color="red">*</font>agetype</td>
		<td><font color="red">*</font>&lt;TYPE&gt;</td>
		<td>&lt;TOPAGE&gt;</td>
		<td>&lt;BASEAGE&gt;</td>
	</tr>
	<tr>
		<td><font color="red">*</font>xtype</td>
		<td><font color="red">*</font>&lt;TYPE&gt;</td>
		<td>&nbsp;</td>
		<td>&nbsp;</td>
	</tr>
</table>
<p>where &lt;TYPE&gt; can be: </p>
<ul>
  <li>fit - stretch the image to fit, disregarding the original aspect ratio </li>
  <li>center</li>
  <li>start - toward the top age for agetype or the left for xtype</li>
  <li>end - toward the base age for agetype or the right for xtype  </li>
</ul>
<p>Note that the xtype line is optional, center is the default. </p>
<h3>Example:</h3>
<pre>
Scotese PALEOMAP	freehand	720	0/0/0			Scotese, C.R., 2002,  http://www.scotese.com, (PALEOMAP website).
image	000.jpg
	agetype	center	0	7
	xtype	center
image	014.jpg	7	21
</pre>

<h2>Transect columns</h2>
<p>Transect columns show the changes of facies in a certain direction, such as showing the stratigraphy between two wells. This is done using polygons and the same patterns used in a facies column.</p>
<p>A transect column's datafile format is an extension of the Facies column format into two dimensions. There is a grid of points, which lines connecting the points and forming polygons. Each polygon can have a pattern fill. </p>
<table border="1">
	<tr>
		<td><font color="red">*</font>&lt;TITLE&gt;</td>
		<td><font color="red">*</font>transect</td>
		<td>&lt;WIDTH&gt;</td>
		<td>&lt;COLOR&gt;</td>
		<td>notitle</td>
		<td>on&nbsp;or&nbsp;off </td>
		<td>&lt;POPUP&gt;</td>
	</tr>
</table>
<p>The point grid follows: </p>
<table border="1">
  <tr>
    <td><font color="red">*</font></td>
    <td><font color="red">*</font></td>
    <td>[x&nbsp;coordinate]</td>
    <td>[x&nbsp;coordinate]</td>
    <td>[x&nbsp;coordinate]</td>
    <td>... </td>
  </tr>
  <tr>
    <td><font color="red">*</font></td>
    <td>[age&nbsp;coordinate]</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
  </tr>
  <tr>
    <td><font color="red">*</font></td>
    <td>[age&nbsp;coordinate]</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
  </tr>
  <tr>
    <td><font color="red">*</font></td>
    <td>[age&nbsp;coordinate]</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
  </tr>
  <tr>
    <td><font color="red">*</font></td>
    <td>...</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
    <td bgcolor="#AAAAAA">&nbsp;</td>
  </tr>
</table>
<p>Each of the shaded cells has both an age and an x-coordinate and can contain an 'X' which means there is a point there. X-coordinates are percentages (values from 0 to 100) of the column width. Points are linked together with lines to form polygons. Lines are a series of cells containing an 'L'. Each 'X', i.e. point, should be used in all polygons that go through that point. This way you are guaranteed to not have any gaps between polygons. Here is an example column with the resulting chart to the right:</p>
<table border="0" cellpadding="4">
<tr>
<td>
<table border="1">
  <tr height="17">
    <td height="17" width="32">Practise transect</td>
    <td width="32">transect</td>
    <td align="right" width="32">200</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
    <td width="32">&nbsp;</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td align="right">0</td>
    <td align="right">10</td>
    <td align="right">15</td>
    <td align="right">20</td>
    <td align="right">30</td>
    <td align="right">40</td>
    <td align="right">50</td>
    <td align="right">60</td>
    <td align="right">70</td>
    <td align="right">80</td>
    <td align="right">90</td>
    <td align="right">100</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td align="right">15</td>
    <td>x</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>x</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>x</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>Sandstone</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>Claystone</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L:lapping</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td align="right">22</td>
    <td>x</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>x</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>x</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>Sandstone</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>L</td>
    <td>x</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td align="right"><font color="#00FF00">*</font></td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>x</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>Claystone</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td align="right">26</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>L</td>
    <td>x</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td align="right">27</td>
    <td>x</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L:wavy</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>x</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td align="right">28</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td align="right">30</td>
    <td>x</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L:wavy</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>x</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>Granitic</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>&nbsp;</td>
    <td>L</td>
  </tr>
  <tr height="17">
    <td height="17">&nbsp;</td>
    <td align="right">33</td>
    <td>x</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>L</td>
    <td>x</td>
  </tr>
</table>
</td>
<td>
<img src="${transect_ex1}" alt="Transect ex1" width="246" height="585" />
</td>
</tr>
</table>
<p>Notice that not all of the lines in the grid have an age. When an age (or an X coordinate) is missing TSC will linearly interpolate between the two closest ages (or X coordinates) to find the missing age (or X coordinate). For example, the age of the point of the &quot;spike&quot; of claystone (cell marked with <font color="#00FF00">*</font>) is interpolated to be 24.5.</p>
<p>Notice also how the &quot;L&quot; cells are used. A line is NOT drawn at a coordinate just because there is an &quot;L&quot; at that position. The &quot;L&quot;s are only a means of linking points. The path taken by the &quot;L&quot;s does not matter as long as it is continous (no breaks) and unambigous (two lines don't meet in the middle).</p>
<p>It is possible to give lines a style like this: &quot;L:&lt;style&gt;&quot;. &lt;style&gt; can be one of the following:
<ul>
	<li>wavy - produces a wavy line, like an unconformity </li>
	<li>lapping - produces a jagged line to show interleaving</li>
    <li>jagged - produces a simple zig-zag </li>
</ul>
<p><strong>Note:</strong> When two lines with styles are close together in the final chart, the amplitude of the wave/jagged portion may be reduced to make sure that the lines do not intersect.
  </p>
</p>
<p>Like is shown in the example, a polygon is a set of points (&quot;X&quot;s) joined by lines (&quot;L&quot;s) to form a closed region and a pattern somewhere in that region. These are pattern names like &quot;Granitic&quot; or &quot;Sandstone&quot;. The pattern may be specified multiple times to make the table easier to read, but all instances must be the same. </p>
<p><h3>THERE IS ANOTHER WAY TO INPUT  TRANSECTS USING A DRAFTING PACKAGE LIKE CorelDraw or Adobe Illustrator.</h3> <br />
This is done by creating a template which is then filled in with polygons in the drafting package. The filled-in template is the loaded back into TSC where the polygons are extracted and the user has tools to get rid of unwanted gaps/overlapping. The finished product can be added as a column to TSC or saved out as a datafile, which is a slight extension of the format above.
</p>
<p>The template can be generated using the &quot;Save Transect Template...&quot; option in the File menu of the Image Editor. A window like this appears:<br />
  <img src="${transect_save_template}" width="543" height="331" /><br />
Enter the ages you are interested in working in and click Save Template As. Open the resulting SVG file in your drafting package and it should look similar to this: <br />
<img src="${transect_template}" width="325" height="313" border="1"/><br />
Also note that the patterns/swatches list has been filled with all the patterns loaded into TSC.</p>
<p>Now fill the red box with polygons and fill the polygons with one of the included patterns/swatches. You can show unconformities or interfingering by taking the wavy/interfinger lines in the template, making a copy of them, and crossing them with whatever lines you want to be wavy/interfingered. Here is an example: <br />
<img src="${transect_template_with_error}" width="334" height="297" border="1"/><br />
Note that the Base Age has also been changed. You also do not have to cramp everything into the small box, you can make the box bigger by resizing it, even though it was kept small here to fit into the guide. </p>
<p>Once the template is done, save it and load it into TSC using &quot;Load Transect Column from Template...&quot; from the File menu of the Image Editor. A window like this appears:<img src="${transect_load_template_with_error}" width="750" height="750" /></p>
<p>There are three main options to help with loading: point merge distance, and snap to grid for age and X. Point merge distance helps to make sure that points which are shared between two polygons are found correctly.<br />
  For example, here is what one part of the above template looks like when zoomed in 800%:<br />
  <img src="${transect_template_space}" width="459" height="117" border="1" /><br />
  Notice the two points in the lower left and the space between them. Those are intended to be coincident, so the points should be the same and there should be no gap. The points are within the  point merge distance so TSC merges them and there is no gap:<br />
<img src="${transect_template_space_merged}" width="240" height="147" border="1" /></p>
<p>The grid simply forces all points to fall on the specified grid. This helps align everything. </p>
<p>If you look closely, you will notice that there are some lines in the preview highlighted red. That means that there are intersections in the template, which is not allowed. One can play with the  point merge distance and grid and see if that takes care of the problem, but in this case it won't. Zooming in closely on the region of the template we notice that one polygon doesn't have a point where the neighboring polygons do:<br />
  <img src="${transect_template_missing_point}" width="538" height="285" /><br />
Note that there is no point in the blue polygon, while there are points in the brown and yellow polygons. This is the source of the gap and the intersection shown in the preview. Adding this missing vertex to the blue polygon in the drafting package and reloading the template fixes the problem.</p>
<p>Once there are no problems in the template you can add the transect as a column to TSC or save it out to a datafile.<br />
  Note that this saved datafile stores lines and polygons separately from the point grid in a listed immediately following the point grid. This is to guarantee that the saved polygons are unambigous. When copying the saved column into your own datapack, be sure to copy the entire grid and polygon set. <br />
</p>
<h1>Popups</h1>
<p>Popups, or mouseover info, is extra information which doesn't fit on a static, printed graph. When enabled in Settings, popups appear as highlighted areas on the chart. When the user clicks, a window pops up with extra information. Nearly all data types in TSCreator support a popup. All column headers support one as well.</p>
<p>Since the  &quot;Information and References&quot; section in Settings also displays the popup text of the selected column's header popup, that is a good place to put references and citations for the data in the column.</p>
<p>Popups can also contain hyperlinks. The format is exactly like in HTML. For example, a link to the TSCreator homepage would be written like this:<br />
  &lt;a href=&quot;http://www.tscreator.com/&quot;&gt;TSCreator homepage&lt;/a&gt;</p>

<h1>Complete Examples</h1>
<p>The best way to make sense of all this information is to see an actual datafile. We've prepared a very stripped down version of the default dataset to use as an example. It is available in <a href="$RESOURCES_HTML_BASEDIR/sample_datafile_text.html">plain text</a> (loadable into TSC PRO), or as <a href="$RESOURCES_HTML_BASEDIR/sample_datafile_table.html">HTML</a> (looks similar to a spreadsheet) </p>
</body>
        </html>
    `;

  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
});
