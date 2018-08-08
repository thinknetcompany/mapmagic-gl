# Nearby Search Algorithm

Calculate the score that uses for sort the results base on distance from the origin ( point of interest ), the score is more valuable when close to the origin.

There are 3 steps to calculate the score

## How to find score

1. the `Score` comes from 2 parts : `Matching Score` and `Factor`
    * `Matching Score` is the score of conformity of giving keyword and information
        - Keyword is word that use for search, keyword will be split into sub words before compare with information
            > Such as "โรงพยาบาล" will be split into "โรง", "พยาบาล" 
    * `Factor`( 0 - 1) is the slope of linear equation of `Offset` and `Scale`, that can see from **[Figure 1.0]**
<br><br><br>
<p align="center"><img src="./static/image/fator_algorithm.png" /></p>
<em><p align="center"><b>Figure 1.0</b> Factor calculation graph.</p></em>
<p style="padding-left:40px; font-size:15px;"><i><u>Description of <b>Figure 1.0</b></u></i><p>
</p>
<i>
<ul style="list-style-type:square font-size:15px;">
    <li><b>Origin</b>: Coordinate of interested point ( lat, lng )</li>
    <li><b>Offset</b>: The radius from <code>Origin</code> to the edge of inner area is in kilometer. <code>Factor</code> is always <b>1</b> in this area.</li>
    <li><b>Scale</b> ( must be greater than 0 ): The outer radius, the distance from the edge of the <code>Offset</code> area to the edge of the outer area is in kilometer. In this area <code>Factor</code> will decrease from <b>1</b> and will be <b>0.5</b> at the edge of outer area and will continue decreasing along the distance away.
    <li><code>Factor</code> is based on slope of the graph ( from ( <code>offset</code>, 1 ) to ( <code>offset</code>+<code>scale</code>, 0.5 ) )
    <blockquote style="font-size: 14px;">Based on the coordinate system of the graph (Distance, Factor)</blockquote></li>
    <li>From <b>Figure 1.0:</b> <b>Offset</b> = 5km, <b>Scale</b> = 5km</li>
</ul>
</i>
<br>
2. Find `Score` from the equation as
<blockquote><code>Score</code> = <code>Matching Score</code> * <code>Factor</code></blockquote>
3. Sort results by `Score`
