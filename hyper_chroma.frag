// Author: Austin Spafford
// Title: Hyper-Chroma
// <dummy-comment to keep the title-scraper from reading into code>

precision highp float;
precision highp int;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

const float k_pi = radians(180.0);
const float k_tau = radians(360.0);

const int k_bloblet_count = 10;

const bool k_blob_enabled = true;
const bool k_ground_enabled = true;

const int k_hyperslice_count = 15;

vec4 s_bloblet_positions[k_bloblet_count];
float s_bloblet_radii[k_bloblet_count];

vec3 s_hyperslice_colors[k_hyperslice_count];
float s_hyperslice_depths[k_hyperslice_count];

vec3 s_light_ambient_color = vec3(0.1);
vec4 s_light_direction; // surface-to-light

vec2 s_mouse_fractions; // (u_mouse / u_resolution)

float saturate(
	float value)
{
	return clamp(value, 0.0, 1.0);
}

float length_sq(
	vec2 vector)
{
	return dot(vector, vector);
}

float sq(
    float value)
{
    return (value * value);
}

vec3 sq(
    vec3 value)
{
    return vec3(
        (value.x * value.x),
        (value.y * value.y),
        (value.z * value.z));
}

float distance_sq(
	vec2 point_one,
	vec2 point_two)
{
    vec2 delta = (point_two - point_one);
    
	return dot(delta, delta);
}

float wrap_angle(
	float original_radians)
{
    return mod(original_radians, k_tau);
}
    
float linear_fraction(
	float min,
	float max,
	float value)
{
	return (min != max) ?
        ((value - min) / (max - min)) :
    	step(value, max);
}

float clamped_linear_fraction(
	float min,
	float max,
	float value)
{
	return clamp(linear_fraction(min, max, value), 0.0, 1.0);
}

float trig_cycle_fraction(
	float domain_fraction)
{
    // Smoothly moves through: (0.0, 0.0), (0.5, 1.0), (1.0, 0.0)
    return linear_fraction(1.0, -1.0, cos(mix(0.0, radians(360.0), domain_fraction)));
}

int int_mod(
    int numerator,
    int divisor)
{
    return (numerator - ((numerator / divisor) * divisor));
}

float soft_add_fractions(
	float first,
	float second)
{
    // Derived from "compliment(compliment(first) * compliment(second))", which has the
    // effect of almost naively adding two fractions when their small, but avoiding going above 1.0 when either one is large.
    return (first + second - (first * second));
}

vec3 soft_add_colors(
	vec3 first,
	vec3 second)
{
    return vec3(
        soft_add_fractions(first.r, second.r),
        soft_add_fractions(first.g, second.g),
        soft_add_fractions(first.b, second.b));
}

float random(
    vec2 st)
{
    // From: https://thebookofshaders.com/10/
	return fract(
		sin(dot(st.xy, vec2(12.9898, 78.233))) * 
		43758.5453123);
}

vec3 hsb_to_rgb(
    vec3 hsb_color)
{
    //  From: Iñigo Quiles 
    //  https://www.shadertoy.com/view/MsS3Wc
    vec3 rgb = clamp(abs(mod((hsb_color.x * 6.0) + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    rgb = (rgb * rgb * (3.0 - (2.0 * rgb)));
    return (hsb_color.z * mix(vec3(1.0), rgb, hsb_color.y));
}

mat2 rotation_matrix(
	float theta)
{    
    float cos_theta = cos(theta);
    float sin_theta = sin(theta);
    
    return mat2(
    	cos_theta, sin_theta, // x-basis
        (-1.0 * sin_theta), cos_theta); // y-basis
}

mat4 rotation_matrix_xy_plane(
	float theta)
{
    float cos_theta = cos(theta);
    float sin_theta = sin(theta);
    
    return mat4(
    	cos_theta, sin_theta, 0.0, 0.0, // x-basis
        (-1.0 * sin_theta), cos_theta, 0.0, 0.0, // y-basis
        0.0, 0.0, 1.0, 0.0, // z-basis
    	0.0, 0.0, 0.0, 1.0); // w-basis
}

mat4 rotation_matrix_xz_plane(
	float theta)
{
    float cos_theta = cos(theta);
    float sin_theta = sin(theta);
    
    return mat4(
    	cos_theta, 0.0, (-1.0 * sin_theta), 0.0, // x-basis
        0.0, 1.0, 0.0, 0.0, // y-basis
        sin_theta, 0.0, cos_theta, 0.0, // z-basis
    	0.0, 0.0, 0.0, 1.0); // w-basis
}

mat4 rotation_matrix_xw_plane(
	float theta)
{
    float cos_theta = cos(theta);
    float sin_theta = sin(theta);
 
    // NOTE: I'm unsure of what the proper rotation-signs should be for rotations involving the w-axis.
    return mat4(
    	cos_theta, 0.0, 0.0, sin_theta, // x-basis
        0.0, 1.0, 0.0, 0.0, // y-basis
    	0.0, 0.0, 1.0, 0.0, // z-basis
        (-1.0 * sin_theta), 0.0, 0.0, cos_theta); // w-basis
}

mat4 rotation_matrix_yz_plane(
	float theta)
{
    float cos_theta = cos(theta);
    float sin_theta = sin(theta);
    
    return mat4(
    	1.0, 0.0, 0.0, 0.0, // x-basis
        0.0, cos_theta, sin_theta, 0.0, // y-basis
        0.0, (-1.0 * sin_theta), cos_theta, 0.0, // z-basis
    	0.0, 0.0, 0.0, 1.0); // w-basis
}

mat4 rotation_matrix_yw_plane(
	float theta)
{
    float cos_theta = cos(theta);
    float sin_theta = sin(theta);
    
    // NOTE: I'm unsure of what the proper rotation-signs should be for rotations involving the w-axis.
    return mat4(
    	1.0, 0.0, 0.0, 0.0, // x-basis
        0.0, cos_theta, 0.0, sin_theta, // y-basis
    	0.0, 0.0, 1.0, 0.0, // z-basis
        0.0, (-1.0 * sin_theta), 0.0, cos_theta); // w-basis
}

mat4 rotation_matrix_zw_plane(
	float theta)
{
    float cos_theta = cos(theta);
    float sin_theta = sin(theta);
    
    // NOTE: I'm unsure of what the proper rotation-signs should be for rotations involving the w-axis.
    return mat4(
    	1.0, 0.0, 0.0, 0.0, // x-basis
        0.0, 1.0, 0.0, 0.0, // y-basis
    	0.0, 0.0, cos_theta, sin_theta, // z-basis
        0.0, 0.0, (-1.0 * sin_theta), cos_theta); // w-basis
}

float smooth_min(
    float first_value,
    float second_value,
    float smoothing_distance)
{
    // Credit: http://www.iquilezles.org/www/articles/smin/smin.htm
    float blend_fraction = saturate(0.5 + (0.5 * ((first_value - second_value) / smoothing_distance)));
    return (
        mix(first_value, second_value, blend_fraction) - 
        (smoothing_distance * (blend_fraction * (1.0 - blend_fraction))));
}

void raytrace_sphere(
    vec4 sphere_center,
    float sphere_radius,
	vec4 ray_origin,
	vec4 ray_direction,
	inout vec3 inout_ray_color,
	inout float inout_ray_depth)
{
    vec4 local_ray_origin = (ray_origin - sphere_center);
    
    // Solving for the intersections via the quadratic equation, as seen in: https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes/ray-sphere-intersection
    float quadratic_a = 1.0; // dot(ray_direction, ray_direction)
    float quadratic_b = (2.0 * dot(local_ray_origin, ray_direction));
    float quadratic_c = (dot(local_ray_origin, local_ray_origin) - sq(sphere_radius));
    float quadratic_discriminant = (sq(quadratic_b) - (4.0 * quadratic_a * quadratic_c));
    
    if (quadratic_discriminant >= 0.0)
    {
        float sqrt_quadratic_discriminant = sqrt(quadratic_discriminant);
        float quadratic_divisor = (1.0 / (2.0 * quadratic_a));
        
        float depth_near = (((-1.0 * quadratic_b) - sqrt_quadratic_discriminant) * quadratic_divisor);
        float depth_far = (((-1.0 * quadratic_b) + sqrt_quadratic_discriminant) * quadratic_divisor);
        
        float depth = ((depth_near >= 0.0) ? depth_near : depth_far);
        
        if ((depth >= 0.0) &&
            (depth < inout_ray_depth))
        {            
            vec4 intersection = (ray_origin + (ray_direction * depth));
            
            vec4 normal = normalize(intersection - sphere_center);
            float diffuse_fraction = (1.0 * max(0.0, dot(normal, s_light_direction)));
            float specular_fraction = 0.0; // (0.5 * pow(max(0.0, (-1.0 * dot(ray_direction, reflect((-1.0 * s_light_direction), normal)))), 40.0));
            
            inout_ray_color = mix(s_light_ambient_color, vec3(1.0), min(1.0, (diffuse_fraction + specular_fraction)));
            inout_ray_depth = depth;
        }
    }
}

void raytrace_scene(
	vec4 ray_origin,
	vec4 ray_direction,
	out vec3 out_ray_color,
	out float out_ray_depth)
{
    out_ray_color = vec3(0.0, 0.0, 0.0);
    out_ray_depth = 1000.0;
    
    for (int bloblet_index = 0; bloblet_index < k_bloblet_count; bloblet_index++)
    {
        raytrace_sphere(
            s_bloblet_positions[bloblet_index],
            s_bloblet_radii[bloblet_index],
            ray_origin,
            ray_direction,
        	out_ray_color,
        	out_ray_depth);
    }
}

void main()
{
    vec2 test_point = (gl_FragCoord.xy / u_resolution.xy);
    
    s_mouse_fractions = (u_mouse / u_resolution.xy);
    
    test_point -= 0.5;
    test_point *= 2.0;
    
    float texture_aspect_ratio = (u_resolution.x / u_resolution.y);
    
    // Perform aspect-ratio correction.
	test_point.x *= max(1.0, texture_aspect_ratio);
    test_point.y *= max(1.0, (1.0 / texture_aspect_ratio));
    
    // Crop down until the artwork is touching at least one pair of edges.
    {
        float artwork_aspect_ratio = 1.0;
        
        //artwork_aspect_ratio = texture_aspect_ratio; // Zoom in until the artwork fills the frame.
        
        if ((artwork_aspect_ratio > 1.0) && (texture_aspect_ratio > 1.0))
        {
            test_point /= min(artwork_aspect_ratio, texture_aspect_ratio);
        }
        else if ((artwork_aspect_ratio < 1.0) && (texture_aspect_ratio < 1.0))
        {
            test_point *= max(artwork_aspect_ratio, texture_aspect_ratio);
        }
    }
    
    s_light_direction = normalize(vec4(1.0, 1.0, 1.0, 0.0));
    
    // Compute the blob parameters.
    for (int bloblet_index = 0; bloblet_index < k_bloblet_count; bloblet_index++)
    {
        float bloblet_fraction = (float(bloblet_index) / float(k_bloblet_count));
        
        vec4 bloblet_movement_rates =
            vec4(
                mix(0.02, 0.1, random(vec2(float(bloblet_index), 0.0))),
                mix(0.02, 0.1, random(vec2(float(bloblet_index), 0.1))),
                mix(0.02, 0.1, random(vec2(float(bloblet_index), 0.2))),
                mix(0.02, 0.1, random(vec2(float(bloblet_index), 0.3))));
        
        s_bloblet_positions[bloblet_index] = (0.75 * vec4(1.0, 1.0, 1.0, 3.0) * sin(k_tau * bloblet_movement_rates * u_time));
        
        s_bloblet_positions[bloblet_index] = vec4(
            cos(k_tau * ((0.0 * u_time) + bloblet_fraction)),
        	sin(k_tau * ((0.0 * u_time) + bloblet_fraction)),
        	0.0,
            (1.0 * cos(k_tau * ((-0.1 * u_time) + (0.5 * bloblet_fraction)))));
        
        s_bloblet_radii[bloblet_index] = (0.75 * mix(1.0, 1.0, random(vec2(float(bloblet_index), 0.3))));
        
        
        //s_bloblet_positions[bloblet_index].xyz = vec3(0.0);
        //s_bloblet_positions[bloblet_index].w *= 2.0;
        //s_bloblet_radii[bloblet_index] = 1.0;
    }
    
    vec3 scene_color;
    {
        // Render all of the hyperslices.
        for (int hyperslice_index = 0; hyperslice_index < k_hyperslice_count; hyperslice_index++)
        {
            float hyperslice_fraction = (float(hyperslice_index) / float(k_hyperslice_count - 1));
            
            // Akin to how test_point varies from -1 to 1 on each axis, we're adding an additional axis of iteration/sampling.
            float hyperslice_w = (0.5 * mix(-1.0, 1.0, hyperslice_fraction));
            
            vec4 ray_origin = vec4(0.0, 0.0, 2.0, 0.0);
            vec4 ray_direction = normalize(vec4(test_point, -1.0, hyperslice_w));

            // Orthographic.
            if (false)
            {
                test_point *= 3.0;
                ray_origin = vec4(test_point, 100.0, hyperslice_w);
                ray_direction = vec4(0.0, 0.0, -1.0, 0.0);
            }

            // Camera-Pitch control.
            if (false)
            {
                mat4 transform = rotation_matrix_yz_plane(k_tau * mix(-0.08, 0.25, (1.0 - s_mouse_fractions.y)));        
                ray_origin *= transform;
                ray_direction *= transform;
            }

            // Camera-Yaw control.
            if (false)
            {
                mat4 transform = rotation_matrix_xz_plane(k_tau * s_mouse_fractions.x);
                ray_origin *= transform;
                ray_direction *= transform;
            }

            raytrace_scene(
                ray_origin,
                ray_direction,
            	s_hyperslice_colors[hyperslice_index],
            	s_hyperslice_depths[hyperslice_index]);
        }
        
        // Composite the hyperslices.
        if (true)
        {
            vec3 color_summation = vec3(0.0);
            
            for (int hyperslice_index = 0; hyperslice_index < k_hyperslice_count; hyperslice_index++)
            {
            	float hyperslice_fraction = (float(hyperslice_index) / float(k_hyperslice_count - 1));
                
                float brightness = dot(s_hyperslice_colors[hyperslice_index], s_hyperslice_colors[hyperslice_index]); // Squaring into linear-space color.                
                vec3 hyperslice_color = hsb_to_rgb(vec3((0.7 * hyperslice_fraction), 1.0, brightness));
                    
                color_summation += hyperslice_color;
            }
        
        	scene_color = sqrt(color_summation / float(k_hyperslice_count)); // Converting back into sqrt-space color.
        }
        else
        {
            vec3 color_summation = vec3(0.0);
            
            for (int hyperslice_index = 0; hyperslice_index < k_hyperslice_count; hyperslice_index++)
            {
                color_summation += sq(s_hyperslice_colors[hyperslice_index]); // Squaring into linear-space color.
            }
        
        	scene_color = sqrt(color_summation / float(k_hyperslice_count)); // Converting back into sqrt-space color.
        }
    }

    vec3 background_color = vec3(0.0);
    //background_color += (vec3(0.4) * max(smoothstep(0.04, 0.0, abs(fract(test_point.x))), smoothstep(0.04, 0.0, abs(fract(test_point.y))))); // Generate a coordinates-grid.
    
    vec3 color = scene_color;         	
    //color = mix(background_color, scene_color.rgb, scene_color.a);
    
    gl_FragColor = vec4(color, 1.0);
}

